import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import {
  updateHostBadgeStatus,
  updatePropertyBadgeStatus,
} from '../services/verificationService';

// @desc    Get pending verifications for admin review
// @route   GET /api/admin/verifications/pending
// @access  Private (Admin only)
export const getPendingVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('verifications')
      .select(`
        id,
        user_id,
        property_id,
        verification_type,
        status,
        submitted_at,
        documents,
        metadata,
        user:users!verifications_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          country
        ),
        property:properties(
          id,
          title,
          address
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (type) {
      query = query.eq('verification_type', type as string);
    }

    const { data: verifications, error } = await query;

    if (error) {
      throw error;
    }

    // Format response to include user details for ID verification comparison
    const formattedVerifications = (verifications || []).map((v: any) => {
      const verification: any = {
        id: v.id,
        type: v.verification_type,
        status: v.status,
        submittedAt: v.submitted_at,
        documents: v.documents,
        metadata: v.metadata,
      };

      // For identity verifications, include user details for comparison
      if (v.verification_type === 'identity' && v.user) {
        verification.user = {
          id: v.user.id,
          name: `${v.user.first_name} ${v.user.last_name}`,
          email: v.user.email,
          phone: v.user.phone,
          address: {
            street: v.user.address,
            city: v.user.city,
            state: v.user.state,
            zipCode: v.user.zip_code,
            country: v.user.country,
          },
        };
      }

      // For property verifications, include property details
      if (v.property) {
        verification.property = {
          id: v.property.id,
          title: v.property.title,
          address: v.property.address,
        };
      }

      return verification;
    });

    res.json({
      success: true,
      data: {
        verifications: formattedVerifications,
        total: formattedVerifications.length,
      },
    });
  } catch (error: any) {
    console.error('Error getting pending verifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending verifications',
      message: error.message,
    });
  }
};

// @desc    Approve verification
// @route   POST /api/admin/verifications/:id/approve
// @access  Private (Admin only)
export const approveVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { notes } = req.body;

    // Get verification record
    const { data: verification, error: fetchError } = await supabase
      .from('verifications')
      .select('user_id, property_id, verification_type, status, metadata')
      .eq('id', id)
      .single();

    if (fetchError || !verification) {
      res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
      return;
    }

    if (verification.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'Verification is not pending',
      });
      return;
    }

    // Update verification record
    const { error: updateError } = await supabase
      .from('verifications')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        metadata: {
          ...verification.metadata,
          approvedNotes: notes,
          approvedAt: new Date().toISOString(),
        },
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Update user or property based on verification type
    if (verification.verification_type === 'identity' && verification.user_id) {
      // Update user's identity_verified_at
      await supabase
        .from('users')
        .update({
          identity_verified_at: new Date().toISOString(),
        })
        .eq('id', verification.user_id);

      // Check and update badge status
      await updateHostBadgeStatus(verification.user_id, supabase);
    } else if (verification.verification_type === 'property_photos' && verification.property_id) {
      // Update property's photos_verified_at
      await supabase
        .from('properties')
        .update({
          photos_verified_at: new Date().toISOString(),
        })
        .eq('id', verification.property_id);

      // Check and update badge status
      await updatePropertyBadgeStatus(verification.property_id, supabase);
    } else if (verification.verification_type === 'property_location' && verification.property_id) {
      // Update property's location_verified_at
      await supabase
        .from('properties')
        .update({
          location_verified_at: new Date().toISOString(),
        })
        .eq('id', verification.property_id);

      // Check and update badge status
      await updatePropertyBadgeStatus(verification.property_id, supabase);
    }

    res.json({
      success: true,
      data: {
        verificationId: id,
        status: 'verified',
        badgeUpdated: true,
        message: 'Verification approved successfully',
      },
    });
  } catch (error: any) {
    console.error('Error approving verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve verification',
      message: error.message,
    });
  }
};

// @desc    Reject verification
// @route   POST /api/admin/verifications/:id/reject
// @access  Private (Admin only)
export const rejectVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { reason, notes } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
      });
      return;
    }

    // Get verification record
    const { data: verification, error: fetchError } = await supabase
      .from('verifications')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchError || !verification) {
      res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
      return;
    }

    // Update verification record
    const { error: updateError } = await supabase
      .from('verifications')
      .update({
        status: 'rejected',
        verified_by: adminId,
        rejection_reason: reason,
        metadata: {
          ...verification.metadata,
          rejectionNotes: notes,
          rejectedAt: new Date().toISOString(),
        },
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Send notification to user about rejection
    // TODO: Implement notification system

    res.json({
      success: true,
      data: {
        verificationId: id,
        status: 'rejected',
        rejectionReason: reason,
        message: 'Verification rejected',
      },
    });
  } catch (error: any) {
    console.error('Error rejecting verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject verification',
      message: error.message,
    });
  }
};

// @desc    Get verification details for admin review
// @route   GET /api/admin/verifications/:id
// @access  Private (Admin only)
export const getVerificationDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data: verification, error } = await supabase
      .from('verifications')
      .select(`
        *,
        user:users!verifications_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          country,
          created_at
        ),
        property:properties(
          id,
          title,
          address,
          city,
          state,
          zip_code
        ),
        verified_by_user:users!verifications_verified_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !verification) {
      res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
      return;
    }

    // Format response with user details for ID comparison
    const formatted = {
      id: verification.id,
      type: verification.verification_type,
      status: verification.status,
      submittedAt: verification.submitted_at,
      verifiedAt: verification.verified_at,
      documents: verification.documents,
      metadata: verification.metadata,
      rejectionReason: verification.rejection_reason,
      expiresAt: verification.expires_at,
      user: verification.user ? {
        id: verification.user.id,
        name: `${verification.user.first_name} ${verification.user.last_name}`,
        email: verification.user.email,
        phone: verification.user.phone,
        address: {
          street: verification.user.address,
          city: verification.user.city,
          state: verification.user.state,
          zipCode: verification.user.zip_code,
          country: verification.user.country,
        },
        memberSince: verification.user.created_at,
      } : null,
      property: verification.property || null,
      verifiedBy: verification.verified_by_user ? {
        id: verification.verified_by_user.id,
        name: `${verification.verified_by_user.first_name} ${verification.verified_by_user.last_name}`,
        email: verification.verified_by_user.email,
      } : null,
    };

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error getting verification details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verification details',
      message: error.message,
    });
  }
};

