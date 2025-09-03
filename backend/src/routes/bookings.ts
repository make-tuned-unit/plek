import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

const getBookings = (_req: any, res: any) => {
  res.json({ message: 'Get all bookings' });
};

const getBooking = (_req: any, res: any) => {
  res.json({ message: 'Get single booking' });
};

const createBooking = (_req: any, res: any) => {
  res.json({ message: 'Create booking' });
};

const updateBooking = (_req: any, res: any) => {
  res.json({ message: 'Update booking' });
};

const cancelBooking = (_req: any, res: any) => {
  res.json({ message: 'Cancel booking' });
};

// Routes
router.route('/').get(protect, getBookings).post(protect, createBooking);
router.route('/:id').get(protect, getBooking).put(protect, updateBooking).delete(protect, cancelBooking);

export { router as bookingRoutes }; 