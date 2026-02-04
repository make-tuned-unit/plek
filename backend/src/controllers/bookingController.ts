/**
 * Booking Controller
 * 
 * Handles all booking-related operations:
 * - Create bookings with availability checking
 * - Get user bookings (as renter or host)
 * - Get single booking details
 * - Update booking status (confirm/cancel)
 * - Cancel bookings
 * - Check property availability
 * 
 * Features:
 * - Automatic conflict detection
 * - Pricing calculation (hourly/daily/weekly/monthly rates)
 * - Service fee calculation
 * - Status validation and transitions
 * - Notification creation
 * - Authorization checks
 */

import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// Types for booking data
interface CreateBookingData {
  propertyId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  specialRequests?: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    color?: string;
    licensePlate?: string;
  };
}

interface BookingConflict {
  hasConflict: boolean;
  conflictingBookings: any[];
}

/**
 * Calculate total hours between two dates
 */
function calculateTotalHours(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Calculate booking price based on property rates
 */
function calculateBookingPrice(
  property: any,
  startTime: Date,
  endTime: Date
): {
  baseAmount: number
  totalAmount: number
  bookerServiceFee: number
  hostServiceFee: number
} {
  const totalHours = calculateTotalHours(startTime, endTime);
  const totalDays = Math.ceil(totalHours / 24);
  
  let baseAmount = 0;
  
  // Calculate base amount based on rates
  if (property.hourly_rate && totalHours < 24) {
    // Use hourly rate for bookings less than 24 hours
    baseAmount = property.hourly_rate * totalHours;
  } else if (property.daily_rate && totalDays >= 1) {
    // Use daily rate for bookings 24+ hours
    baseAmount = property.daily_rate * totalDays;
  } else if (property.weekly_rate && totalDays >= 7) {
    // Use weekly rate for bookings 7+ days
    const weeks = Math.ceil(totalDays / 7);
    baseAmount = property.weekly_rate * weeks;
  } else if (property.monthly_rate && totalDays >= 30) {
    // Use monthly rate for bookings 30+ days
    const months = Math.ceil(totalDays / 30);
    baseAmount = property.monthly_rate * months;
  } else if (property.hourly_rate) {
    // Fallback to hourly rate
    baseAmount = property.hourly_rate * totalHours;
  } else {
    throw new Error('Property has no pricing configured');
  }
  
  // Calculate total service fee (default 10% split evenly between booker and host, or from property settings)
  const totalFeePercentage = property.service_fee_percentage || 10;
  const hostFeePercentage = totalFeePercentage / 2;
  const bookerFeePercentage = totalFeePercentage / 2;

  const hostServiceFee = (baseAmount * hostFeePercentage) / 100;
  const bookerServiceFee = (baseAmount * bookerFeePercentage) / 100;
  
  const totalAmount = baseAmount + bookerServiceFee;
  
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100, // Amount charged to booker
    bookerServiceFee: Math.round(bookerServiceFee * 100) / 100,
    hostServiceFee: Math.round(hostServiceFee * 100) / 100,
  };
}

/**
 * Check if booking times conflict with existing bookings
 */
async function checkBookingConflicts(
  propertyId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<BookingConflict> {
  const supabase = getSupabaseClient();
  
  // Get all confirmed or pending bookings for this property
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('property_id', propertyId)
    .in('status', ['pending', 'confirmed']);
  
  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }
  
  const { data: allBookings, error } = await query;
  
  if (error) {
    throw error;
  }
  
  // Filter for bookings that actually overlap with the requested time range
  const conflictingBookings = (allBookings || []).filter((booking: any) => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    // Check if time ranges overlap
    return (
      (startTime >= bookingStart && startTime < bookingEnd) ||
      (endTime > bookingStart && endTime <= bookingEnd) ||
      (startTime <= bookingStart && endTime >= bookingEnd)
    );
  });
  
  return {
    hasConflict: conflictingBookings.length > 0,
    conflictingBookings: conflictingBookings,
  };
}

/**
 * Validate booking request
 */
async function validateBookingRequest(
  propertyId: string,
  startTime: Date,
  endTime: Date,
  renterId: string
): Promise<{ isValid: boolean; error?: string; property?: any }> {
  const supabase = getSupabaseClient();
  
  // Get property
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('status', 'active')
    .single();
  
  if (propertyError || !property) {
    return { isValid: false, error: 'Property not found or not available' };
  }
  
  // Check if property is available
  if (!property.is_available) {
    return { isValid: false, error: 'Property is not available for booking' };
  }
  
  // Check if user is trying to book their own property
  if (property.host_id === renterId) {
    return { isValid: false, error: 'You cannot book your own property' };
  }
  
  // Validate dates
  const now = new Date();
  if (startTime < now) {
    return { isValid: false, error: 'Start time cannot be in the past' };
  }
  
  if (endTime <= startTime) {
    return { isValid: false, error: 'End time must be after start time' };
  }
  
  // Check minimum booking hours
  const totalHours = calculateTotalHours(startTime, endTime);
  if (totalHours < (property.min_booking_hours || 1)) {
    return {
      isValid: false,
      error: `Minimum booking duration is ${property.min_booking_hours || 1} hours`,
    };
  }
  
  // Check maximum booking days
  const totalDays = totalHours / 24;
  if (totalDays > (property.max_booking_days || 30)) {
    return {
      isValid: false,
      error: `Maximum booking duration is ${property.max_booking_days || 30} days`,
    };
  }
  
  // Check for conflicts
  const conflictCheck = await checkBookingConflicts(propertyId, startTime, endTime);
  if (conflictCheck.hasConflict) {
    return {
      isValid: false,
      error: 'Property is not available for the selected dates',
    };
  }
  
  return { isValid: true, property };
}

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const renterId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    const { propertyId, startTime, endTime, specialRequests, vehicleInfo }: CreateBookingData = req.body;
    
    // Validate required fields
    if (!propertyId || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Property ID, start time, and end time are required',
      });
      return;
    }
    
    // Parse dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    // Validate booking request
    const validation = await validateBookingRequest(propertyId, startDate, endDate, renterId);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }
    
    const property = validation.property!;
    
    // Calculate pricing
    const { baseAmount, totalAmount, bookerServiceFee, hostServiceFee } = calculateBookingPrice(
      property,
      startDate,
      endDate
    );
    
    // Calculate total hours
    const totalHours = calculateTotalHours(startDate, endDate);
    
    // Always create booking as 'pending' - will be confirmed only after successful payment
    const requiresApproval = property.require_approval === true;
    const initialStatus = requiresApproval ? 'pending' : 'confirmed';
    
    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        property_id: propertyId,
        renter_id: renterId,
        host_id: property.host_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        total_hours: totalHours,
        total_amount: totalAmount,
        service_fee: bookerServiceFee,
        status: initialStatus,
        payment_status: requiresApproval ? 'pending' : 'pending',
        special_requests: specialRequests || null,
        vehicle_info: vehicleInfo || null,
      } as any)
      .select(`
        *,
        property:properties(*),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email, phone),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email, phone)
      `)
      .single();
    
    if (bookingError) {
      throw bookingError;
    }
    
    // Notify host
    await supabase.from('notifications').insert({
      user_id: property.host_id,
      type: requiresApproval ? 'booking_request' : 'booking_confirmed',
      title: requiresApproval ? 'New Booking Request' : 'New Booking Confirmed',
      message: requiresApproval
        ? `You have a new booking request for ${property.title}`
        : `A driver just booked ${property.title}`,
      data: { booking_id: booking.id, property_id: propertyId },
      is_read: false,
    } as any);
    
    // Send emails (don't wait - fire and forget)
    const { sendBookingConfirmationEmail, sendBookingNotificationEmail } = await import('../services/emailService');
    
    // Format vehicle info as string
    const vehicleInfoString = vehicleInfo 
      ? `${vehicleInfo.make || ''} ${vehicleInfo.model || ''} ${vehicleInfo.color || ''} ${vehicleInfo.licensePlate || ''}`.trim()
      : undefined;
    
    // Prepare email data
    const emailDataBase = {
      bookingId: booking.id,
      renterName: `${booking.renter.first_name} ${booking.renter.last_name}`,
      renterEmail: booking.renter.email,
      hostName: booking.host ? `${booking.host.first_name} ${booking.host.last_name}` : 'Host',
      hostEmail: booking.host?.email || '',
      propertyTitle: property.title,
      propertyAddress: property.address,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      totalHours: totalHours,
      baseAmount,
      totalAmount,
      serviceFee: bookerServiceFee,
      bookerServiceFee,
      hostServiceFee,
      securityDeposit: booking.security_deposit || 0,
      ...(vehicleInfoString && { vehicleInfo: vehicleInfoString }),
      ...(specialRequests && { specialRequests }),
    };
    
    // Send confirmation email to renter
    if (booking.renter && booking.renter.email) {
      sendBookingConfirmationEmail({
        ...emailDataBase,
        renterName: `${booking.renter.first_name} ${booking.renter.last_name}`,
        renterEmail: booking.renter.email,
        hostName: booking.host ? `${booking.host.first_name} ${booking.host.last_name}` : 'Host',
        hostEmail: booking.host?.email || '',
      } as any).catch((error) => {
        console.error('Failed to send booking confirmation email:', error);
      });
    }
    
    // Send notification email to host
    if (booking.host && booking.host.email) {
      sendBookingNotificationEmail({
        ...emailDataBase,
        renterName: `${booking.renter.first_name} ${booking.renter.last_name}`,
        renterEmail: booking.renter.email,
        hostName: `${booking.host.first_name} ${booking.host.last_name}`,
        hostEmail: booking.host.email,
      } as any).catch((error) => {
        console.error('Failed to send booking notification email:', error);
      });
    }
    
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking request created. Please complete payment to confirm your booking.',
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      message: error.message,
    });
  }
};

// @desc    Get all bookings for the current user
// @route   GET /api/bookings
// @access  Private
export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { role, status } = req.query;
    
    // Determine which bookings to fetch (as renter or host)
    const column = role === 'host' ? 'host_id' : 'renter_id';
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        property:properties(
          id,
          title,
          address,
          city,
          state,
          zip_code,
          photos:property_photos(url, is_primary)
        ),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email, phone, avatar),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email, phone, avatar)
      `)
      .eq(column, userId)
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status as string);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: {
        bookings: bookings || [],
        count: bookings?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error.message,
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Get booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(
          *,
          photos:property_photos(*),
          host:users!properties_host_id_fkey(id, first_name, last_name, email, phone, avatar)
        ),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email, phone, avatar),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email, phone, avatar),
        payments:payments(*)
      `)
      .eq('id', id)
      .single();
    
    if (error || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }
    
    // Check if user has access to this booking
    if (booking.renter_id !== userId && booking.host_id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to view this booking',
      });
      return;
    }
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking',
      message: error.message,
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Private
export const updateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { status, paymentStatus } = req.body;
    
    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, property:properties(*)')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingBooking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }
    
    // Check authorization (only host can confirm/cancel, renter can cancel)
    const isHost = existingBooking.host_id === userId;
    const isRenter = existingBooking.renter_id === userId;
    
    if (!isHost && !isRenter) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to update this booking',
      });
      return;
    }
    
    // Validate status transitions
    if (status) {
      const currentStatus = existingBooking.status;
      
      // Host can confirm or cancel
      if (isHost) {
        if (status === 'confirmed' && currentStatus !== 'pending') {
          res.status(400).json({
            success: false,
            error: 'Can only confirm pending bookings',
          });
          return;
        }
        if (status === 'cancelled' && currentStatus === 'completed') {
          res.status(400).json({
            success: false,
            error: 'Cannot cancel completed bookings',
          });
          return;
        }
      }
      
      // Renter can only cancel
      if (isRenter && status === 'cancelled') {
        if (currentStatus === 'completed') {
          res.status(400).json({
            success: false,
            error: 'Cannot cancel completed bookings',
          });
          return;
        }
      } else if (isRenter && status !== 'cancelled') {
        res.status(403).json({
          success: false,
          error: 'Renters can only cancel bookings',
        });
        return;
      }
    }
    
    // Build update object
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.payment_status = paymentStatus;
    
    // Refund policy: auto full refund only when cancelled 24+ hours before start (host or renter)
    if (status === 'cancelled' && existingBooking.payment_status === 'completed') {
      const startTime = new Date(existingBooking.start_time).getTime();
      const hoursUntilStart = (startTime - Date.now()) / (1000 * 60 * 60);
      const autoFullRefund = hoursUntilStart >= 24;
      if (autoFullRefund) {
        try {
          const { data: paymentRecord } = await supabase
            .from('payments')
            .select('*')
            .eq('booking_id', id)
            .eq('status', 'completed')
            .single();
          if (paymentRecord?.stripe_payment_id) {
            const Stripe = await import('stripe').then(m => m.default);
            const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
            if (stripeSecretKey) {
              const stripeInstance = new Stripe(stripeSecretKey.replace(/^["']|["']$/g, ''), { apiVersion: '2023-10-16' });
              try {
                const refund = await stripeInstance.refunds.create({
                  payment_intent: paymentRecord.stripe_payment_id,
                  reason: 'requested_by_customer',
                });
                await supabase.from('payments').update({ status: 'refunded', stripe_refund_id: refund.id }).eq('id', paymentRecord.id);
                updateData.payment_status = 'refunded';
                console.log(`[Booking] Auto full refund (24h+ before start) for booking ${id}: ${refund.id}`);
              } catch (refundError: any) {
                console.error(`[Booking] Failed to process refund for booking ${id}:`, refundError);
              }
            }
          }
        } catch (error: any) {
          console.error(`[Booking] Error processing refund for booking ${id}:`, error);
        }
      }
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email)
      `)
      .single();
    
    if (updateError) throw updateError;
    
    // Create notifications
    if (status === 'confirmed') {
      // Notify renter
      await supabase.from('notifications').insert({
        user_id: existingBooking.renter_id,
        type: 'booking_confirmed',
        title: 'Booking Confirmed',
        message: `Your booking for ${existingBooking.property?.title || 'property'} has been confirmed`,
        data: { booking_id: id, property_id: existingBooking.property_id },
        is_read: false,
      } as any);
    } else if (status === 'cancelled') {
      // Notify the other party
      const notifyUserId = isHost ? existingBooking.renter_id : existingBooking.host_id;
      await supabase.from('notifications').insert({
        user_id: notifyUserId,
        type: 'booking_cancelled',
        title: isHost ? 'Booking Rejected' : 'Booking Cancelled',
        message: isHost 
          ? `Your booking request for ${existingBooking.property?.title || 'property'} was rejected. You will receive a full refund.`
          : `Booking for ${existingBooking.property?.title || 'property'} has been cancelled`,
        data: { booking_id: id, property_id: existingBooking.property_id },
        is_read: false,
      } as any);
    } else if (status === 'completed') {
      // Get property and host details for review reminders and payout email
      const { data: property } = await supabase
        .from('properties')
        .select('title')
        .eq('id', existingBooking.property_id)
        .single();

      const propertyTitle = property?.title || 'property';

      // Send "your payout is on the way" to host only when booking is completed (not when payment is first confirmed)
      const { data: hostUser } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, stripe_account_id, stripe_account_status')
        .eq('id', existingBooking.host_id)
        .single();
      if (hostUser?.email) {
        const bookerServiceFee = Number(existingBooking.service_fee) || 0;
        const baseAmount = Number(existingBooking.total_amount) - bookerServiceFee;
        const hostServiceFee = (baseAmount * 5) / 100;
        const hostPayoutAmount = Math.round((baseAmount - hostServiceFee) * 100) / 100;
        const hasConnectAccount = !!(hostUser as any).stripe_account_id && (hostUser as any).stripe_account_status === 'active';
        const { sendHostPayoutOnTheWayEmail } = await import('../services/emailService');
        sendHostPayoutOnTheWayEmail({
          hostName: `${hostUser.first_name || ''} ${hostUser.last_name || ''}`.trim() || 'Host',
          hostEmail: hostUser.email,
          propertyTitle,
          bookingId: id,
          amount: hostPayoutAmount,
          hasConnectAccount,
        }).catch((err: Error) => {
          console.error('[Booking] Failed to send host payout-on-the-way email', err);
        });
      }

      // Check if reviews already exist for this booking
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('reviewer_id')
        .eq('booking_id', id);

      const reviewerIds = (existingReviews || []).map((r: any) => r.reviewer_id);

      // Notify renter to review host (if not already reviewed)
      if (!reviewerIds.includes(existingBooking.renter_id)) {
        const { data: hostUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', existingBooking.host_id)
          .single();

        const hostName = hostUser ? `${hostUser.first_name || ''} ${hostUser.last_name || ''}`.trim() : 'the host';

        await supabase.from('notifications').insert({
          user_id: existingBooking.renter_id,
          type: 'review_reminder',
          title: 'Leave a Review',
          message: `How was your experience with ${hostName}? Leave a review for ${propertyTitle}`,
          data: { 
            booking_id: id, 
            property_id: existingBooking.property_id,
            reviewed_user_id: existingBooking.host_id,
          },
          is_read: false,
        } as any);
      }

      // Notify host to review renter (if not already reviewed)
      if (!reviewerIds.includes(existingBooking.host_id)) {
        const { data: renterUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', existingBooking.renter_id)
          .single();

        const renterName = renterUser ? `${renterUser.first_name || ''} ${renterUser.last_name || ''}`.trim() : 'the renter';

        await supabase.from('notifications').insert({
          user_id: existingBooking.host_id,
          type: 'review_reminder',
          title: 'Leave a Review',
          message: `How was your experience with ${renterName}? Leave a review for your booking at ${propertyTitle}`,
          data: { 
            booking_id: id, 
            property_id: existingBooking.property_id,
            reviewed_user_id: existingBooking.renter_id,
          },
          is_read: false,
        } as any);
      }
    }
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking',
      message: error.message,
    });
  }
};

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Private
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, property:properties(*)')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingBooking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }
    
    // Check authorization
    const isHost = existingBooking.host_id === userId;
    const isRenter = existingBooking.renter_id === userId;
    
    if (!isHost && !isRenter) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this booking',
      });
      return;
    }
    
    // Check if booking can be cancelled
    if (existingBooking.status === 'completed') {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel completed bookings',
      });
      return;
    }
    
    if (existingBooking.status === 'cancelled') {
      res.status(400).json({
        success: false,
        error: 'Booking is already cancelled',
      });
      return;
    }

    // Refund policy: full refund only when cancelled 24+ hours before start; otherwise host manages refunds in Payments
    const startTime = new Date(existingBooking.start_time).getTime();
    const hoursUntilStart = (startTime - Date.now()) / (1000 * 60 * 60);
    const autoFullRefund = existingBooking.payment_status === 'completed' && hoursUntilStart >= 24;

    if (autoFullRefund) {
      try {
        const { data: paymentRecord } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', id)
          .eq('status', 'completed')
          .single();

        if (paymentRecord && paymentRecord.stripe_payment_id) {
          const Stripe = await import('stripe').then(m => m.default);
          const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
          if (stripeSecretKey) {
            const cleanKey = stripeSecretKey.replace(/^["']|["']$/g, '');
            const stripeInstance = new Stripe(cleanKey, { apiVersion: '2023-10-16' });
            try {
              const refund = await stripeInstance.refunds.create({
                payment_intent: paymentRecord.stripe_payment_id,
                reason: 'requested_by_customer',
              });
              await supabase
                .from('payments')
                .update({ status: 'refunded', stripe_refund_id: refund.id })
                .eq('id', paymentRecord.id);
              await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', id);
              console.log(`[Booking] Auto full refund (24h+ before start) for booking ${id}: ${refund.id}`);
            } catch (refundError: any) {
              console.error(`[Booking] Failed to process refund for booking ${id}:`, refundError);
            }
          }
        }
      } catch (error: any) {
        console.error(`[Booking] Error processing refund for booking ${id}:`, error);
      }
    }
    // If within 24h of start and paid: no auto refund; host can issue full/partial/none from Payments → Refunds

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email)
      `)
      .single();
    
    if (updateError) throw updateError;
    
    const notifyUserId = isHost ? existingBooking.renter_id : existingBooking.host_id;
    const refundMessage = autoFullRefund
      ? ' You will receive a full refund.'
      : (existingBooking.payment_status === 'completed'
        ? ' Refunds for cancellations within 24 hours are at the host\'s discretion.'
        : '');
    await supabase.from('notifications').insert({
      user_id: notifyUserId,
      type: 'booking_cancelled',
      title: isHost ? 'Booking Rejected' : 'Booking Cancelled',
      message: isHost
        ? `Your booking request for ${existingBooking.property?.title || 'property'} was rejected.${refundMessage}`
        : `Booking for ${existingBooking.property?.title || 'property'} has been cancelled.${refundMessage}`,
      data: { booking_id: id, property_id: existingBooking.property_id },
      is_read: false,
    } as any);

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
      message: error.message,
    });
  }
};

// @desc    Check availability for a property
// @route   GET /api/bookings/availability/:propertyId
// @access  Public
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { startTime, endTime } = req.query;
    const supabase = getSupabaseClient();
    
    if (!propertyId) {
      res.status(400).json({
        success: false,
        error: 'Property ID is required',
      });
      return;
    }
    
    if (!startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Start time and end time are required',
      });
      return;
    }
    
    const startDate = new Date(startTime as string);
    const endDate = new Date(endTime as string);
    
    // Get property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();
    
    if (propertyError || !property) {
      res.status(404).json({
        success: false,
        error: 'Property not found',
      });
      return;
    }
    
    // Check for conflicts
    const conflictCheck = await checkBookingConflicts(propertyId, startDate, endDate);
    
    const isAvailable = !conflictCheck.hasConflict && property.is_available;
    
    res.json({
      success: true,
      data: {
        isAvailable,
        hasConflict: conflictCheck.hasConflict,
        conflictingBookings: conflictCheck.conflictingBookings,
        property: {
          id: property.id,
          title: property.title,
          isAvailable: property.is_available,
          instantBooking: property.instant_booking,
        },
      },
    });
  } catch (error: any) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
      message: error.message,
    });
  }
};

// @desc    Generate review reminders for completed bookings
// @route   POST /api/bookings/generate-review-reminders
// @access  Private (Admin or for specific booking)
export const generateReviewReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { bookingId } = req.body;

    // Verify user is admin or booking participant
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    let query = supabase
      .from('bookings')
      .select(`
        id,
        renter_id,
        host_id,
        property_id,
        status,
        property:properties(title)
      `)
      .eq('status', 'completed');

    // If bookingId provided, only process that booking
    if (bookingId) {
      query = query.eq('id', bookingId);
      
      // If not admin, verify user is part of the booking
      if (!isAdmin) {
        const { data: booking } = await query.single();
        if (!booking || (booking.renter_id !== userId && booking.host_id !== userId)) {
          res.status(403).json({
            success: false,
            error: 'Not authorized',
          });
          return;
        }
      }
    } else if (!isAdmin) {
      // If no bookingId and not admin, only process user's bookings
      query = query.or(`renter_id.eq.${userId},host_id.eq.${userId}`);
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
      });
      return;
    }

    if (!bookings || bookings.length === 0) {
      res.json({
        success: true,
        data: {
          processed: 0,
          created: 0,
          message: 'No completed bookings found',
        },
      });
      return;
    }

    let createdCount = 0;
    let processedCount = 0;    for (const booking of bookings) {
      processedCount++;

      // Check if reviews already exist for this booking
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('reviewer_id')
        .eq('booking_id', booking.id);

      const reviewerIds = (existingReviews || []).map((r: any) => r.reviewer_id);

      // Check if review reminder notifications already exist
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'review_reminder')
        .or(`data->>'booking_id'.eq.${booking.id},data->>'bookingId'.eq.${booking.id}`);

      const hasNotifications = existingNotifications && existingNotifications.length > 0;

      const propertyTitle = booking.property?.title || 'property';

      // Notify renter to review host (if not already reviewed and no notification exists)
      if (!reviewerIds.includes(booking.renter_id) && !hasNotifications) {
        const { data: hostUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', booking.host_id)
          .single();

        const hostName = hostUser ? `${hostUser.first_name || ''} ${hostUser.last_name || ''}`.trim() : 'the host';

        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: booking.renter_id,
          type: 'review_reminder',
          title: 'Leave a Review',
          message: `How was your experience with ${hostName}? Leave a review for ${propertyTitle}`,
          data: { 
            booking_id: booking.id, 
            property_id: booking.property_id,
            reviewed_user_id: booking.host_id,
          },
          is_read: false,
        } as any);

        if (!notifyError) {
          createdCount++;
        }
      }

      // Notify host to review renter (if not already reviewed and no notification exists)
      if (!reviewerIds.includes(booking.host_id) && !hasNotifications) {
        const { data: renterUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', booking.renter_id)
          .single();

        const renterName = renterUser ? `${renterUser.first_name || ''} ${renterUser.last_name || ''}`.trim() : 'the renter';

        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: booking.host_id,
          type: 'review_reminder',
          title: 'Leave a Review',
          message: `How was your experience with ${renterName}? Leave a review for your booking at ${propertyTitle}`,
          data: { 
            booking_id: booking.id, 
            property_id: booking.property_id,
            reviewed_user_id: booking.renter_id,
          },
          is_read: false,
        } as any);

        if (!notifyError) {
          createdCount++;
        }
      }
    }

    res.json({
      success: true,
      data: {
        processed: processedCount,
        created: createdCount,
        message: `Processed ${processedCount} booking(s), created ${createdCount} review reminder notification(s)`,
      },
    });
  } catch (error: any) {
    console.error('Error generating review reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate review reminders',
      message: error.message,
    });
  }
};
