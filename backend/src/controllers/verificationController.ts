import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import {
  getVerificationStatus,
  updateHostBadgeStatus,
  updatePropertyBadgeStatus,
} from '../services/verificationService';

// @desc    Submit identity verification documents
// @route   POST /api/verification/submit-identity
// @access  Private
export const submitIdentityVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const { documentType, frontImageUrl, backImageUrl, notes } = req.body;

    if (!documentType || !frontImageUrl) {
      res.status(400).json({
        success: false,
        error: 'Document type and front image are required',
      });
      return;
    }

    // Check if user already has a pending or verified identity verification
    const { data: existingVerification } = await supabase
      .from('verifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('verification_type', 'identity')
      .in('status', ['pending', 'verified'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingVerification) {
      if (existingVerification.status === 'verified') {
        res.status(400).json({
          success: false,
          error: 'Identity is already verified',
        });
        return;
      } else if (existingVerification.status === 'pending') {
        res.status(400).json({
          success: false,
          error: 'Identity verification is already pending review',
        });
        return;
      }
    }

    // Store documents in verification record
    const documents = {
      documentType,
      frontImage: frontImageUrl,
      backImage: backImageUrl || null,
      notes: notes || null,
    };

    // Create verification record
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .insert({
        user_id: userId,
        verification_type: 'identity',
        status: 'pending',
        documents,
        metadata: {
          submittedBy: userId,
          submittedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (verificationError || !verification) {
      console.error('Error creating verification record:', verificationError);
      res.status(500).json({
        success: false,
        error: 'Failed to submit verification',
        message: verificationError?.message,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        verificationId: verification.id,
        status: 'pending',
        message: 'Identity verification submitted. Admin will review within 24-48 hours.',
      },
    });
  } catch (error: any) {
    console.error('Error submitting identity verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit verification',
      message: error.message,
    });
  }
};

// @desc    Get verification status
// @route   GET /api/verification/status
// @access  Private
export const getVerificationStatusEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const status = await getVerificationStatus(userId, supabase);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verification status',
      message: error.message,
    });
  }
};

// @desc    Get verification history
// @route   GET /api/verification/history
// @access  Private
export const getVerificationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const { data: verifications, error } = await supabase
      .from('verifications')
      .select(`
        id,
        verification_type,
        status,
        submitted_at,
        verified_at,
        verified_by,
        rejection_reason,
        expires_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        verifications: verifications || [],
      },
    });
  } catch (error: any) {
    console.error('Error getting verification history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verification history',
      message: error.message,
    });
  }
};

