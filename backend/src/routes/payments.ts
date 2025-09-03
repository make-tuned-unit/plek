import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

const createPaymentIntent = (_req: any, res: any) => {
  res.json({ message: 'Create payment intent' });
};

const confirmPayment = (_req: any, res: any) => {
  res.json({ message: 'Confirm payment' });
};

const getPaymentHistory = (_req: any, res: any) => {
  res.json({ message: 'Get payment history' });
};

// Routes
router.route('/').get(protect, getPaymentHistory).post(protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

export { router as paymentRoutes }; 