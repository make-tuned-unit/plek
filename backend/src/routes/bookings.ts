import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

// TODO: Implement booking controllers
const getBookings = (req: any, res: any) => {
  res.json({ message: 'Get bookings' });
};

const getBooking = (req: any, res: any) => {
  res.json({ message: 'Get booking' });
};

const createBooking = (req: any, res: any) => {
  res.json({ message: 'Create booking' });
};

const updateBooking = (req: any, res: any) => {
  res.json({ message: 'Update booking' });
};

const cancelBooking = (req: any, res: any) => {
  res.json({ message: 'Cancel booking' });
};

// Routes
router.get('/', protect, getBookings);
router.get('/:id', protect, getBooking);
router.post('/', protect, createBooking);
router.put('/:id', protect, updateBooking);
router.delete('/:id', protect, cancelBooking);

export { router as bookingRoutes }; 