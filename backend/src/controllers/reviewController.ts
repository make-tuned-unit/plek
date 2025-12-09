import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { bookingId, rating, comment, cleanliness, communication, checkIn, accuracy, value } = req.body;

    if (!bookingId || !rating) {
      res.status(400).json({
        success: false,
        error: 'Booking ID and rating are required',
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
      return;
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(*),
        renter:users!bookings_renter_id_fkey(id),
        host:users!bookings_host_id_fkey(id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: 'Can only review completed bookings',
      });
      return;
    }

    // Determine who is being reviewed (opposite of reviewer)
    const isRenter = booking.renter_id === userId;
    const isHost = booking.host_id === userId;

    if (!isRenter && !isHost) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to review this booking',
      });
      return;
    }

    const reviewedUserId = isRenter ? booking.host_id : booking.renter_id;

    // Check if review already exists for this booking from this reviewer
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', userId)
      .single();

    if (existingReview) {
      res.status(400).json({
        success: false,
        error: 'You have already reviewed this booking',
      });
      return;
    }

    // Validate optional ratings
    const optionalRatings = { cleanliness, communication, checkIn, accuracy, value };
    for (const [key, value] of Object.entries(optionalRatings)) {
      if (value !== undefined && (value < 1 || value > 5)) {
        res.status(400).json({
          success: false,
          error: `${key} rating must be between 1 and 5`,
        });
        return;
      }
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        reviewer_id: userId,
        reviewed_user_id: reviewedUserId,
        property_id: booking.property_id,
        rating,
        comment: comment || null,
        cleanliness: cleanliness || null,
        communication: communication || null,
        check_in: checkIn || null,
        accuracy: accuracy || null,
        value: value || null,
      } as any)
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, first_name, last_name),
        reviewed_user:users!reviews_reviewed_user_id_fkey(id, first_name, last_name)
      `)
      .single();

    if (reviewError || !review) {
      console.error('Error creating review:', reviewError);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create review';
      if (reviewError?.code === '23505') { // Unique constraint violation
        errorMessage = 'A review for this booking already exists. Each booking can only have one review.';
      } else if (reviewError?.message) {
        errorMessage = reviewError.message;
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage,
        details: reviewError,
      });
      return;
    }

    // Create notification for reviewed user
    const { data: reviewedUser } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', reviewedUserId)
      .single();

    const reviewerName = `${(req as any).user.first_name || ''} ${(req as any).user.last_name || ''}`.trim() || 'Someone';

    await supabase.from('notifications').insert({
      user_id: reviewedUserId,
      type: 'review_received',
      title: 'New Review Received',
      message: `${reviewerName} left you a ${rating}-star review`,
      data: {
        bookingId,
        reviewId: review.id,
        rating,
      },
    } as any);

    res.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Error in createReview:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// @desc    Get reviews for a booking
// @route   GET /api/reviews/booking/:bookingId
// @access  Private
export const getBookingReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;

    // Verify user has access to this booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('renter_id, host_id')
      .eq('id', bookingId)
      .single();

    if (!booking || (booking.renter_id !== userId && booking.host_id !== userId)) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to view reviews for this booking',
      });
      return;
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, first_name, last_name),
        reviewed_user:users!reviews_reviewed_user_id_fkey(id, first_name, last_name)
      `)
      .eq('booking_id', bookingId);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews',
      });
      return;
    }

    res.json({
      success: true,
      data: reviews || [],
    });
  } catch (error: any) {
    console.error('Error in getBookingReviews:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public (or Private if we want to restrict)
export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { userId } = req.params;

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, first_name, last_name),
        reviewed_user:users!reviews_reviewed_user_id_fkey(id, first_name, last_name),
        property:properties(id, title, address)
      `)
      .eq('reviewed_user_id', userId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching user reviews:', reviewsError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews',
      });
      return;
    }

    res.json({
      success: true,
      data: reviews || [],
    });
  } catch (error: any) {
    console.error('Error in getUserReviews:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// @desc    Check if user can review a booking
// @route   GET /api/reviews/check/:bookingId
// @access  Private
export const checkReviewEligibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status, renter_id, host_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }

    const isRenter = booking.renter_id === userId;
    const isHost = booking.host_id === userId;

    if (!isRenter && !isHost) {
      res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
      return;
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      res.json({
        success: true,
        data: {
          canReview: false,
          reason: 'Booking is not completed',
        },
      });
      return;
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', userId)
      .single();

    res.json({
      success: true,
      data: {
        canReview: !existingReview,
        hasReviewed: !!existingReview,
      },
    });
  } catch (error: any) {
    console.error('Error in checkReviewEligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

