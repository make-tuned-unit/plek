import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createReview,
  getBookingReviews,
  getUserReviews,
  checkReviewEligibility,
} from '../controllers/reviewController';

const router = Router();

// Routes
router.post('/', protect, createReview);
router.get('/booking/:bookingId', protect, getBookingReviews);
router.get('/user/:userId', getUserReviews);
router.get('/check/:bookingId', protect, checkReviewEligibility);

export { router as reviewRoutes };

