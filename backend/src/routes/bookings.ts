import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  checkAvailability,
  generateReviewReminders,
} from '../controllers/bookingController';

const router = Router();

// Public route for availability checking
router.get('/availability/:propertyId', checkAvailability);

// Protected routes
router.route('/').get(protect, getBookings).post(protect, createBooking);
router.post('/generate-review-reminders', protect, generateReviewReminders);
router.route('/:id').get(protect, getBooking).put(protect, updateBooking).delete(protect, cancelBooking);

export { router as bookingRoutes }; 