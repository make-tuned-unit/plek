import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

// TODO: Implement payment controllers
const createPaymentIntent = (req: any, res: any) => {
  res.json({ message: 'Create payment intent' });
};

const confirmPayment = (req: any, res: any) => {
  res.json({ message: 'Confirm payment' });
};

const getPaymentHistory = (req: any, res: any) => {
  res.json({ message: 'Get payment history' });
};

// Routes
router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.get('/history', protect, getPaymentHistory);

export { router as paymentRoutes }; 