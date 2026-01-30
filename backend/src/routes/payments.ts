import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createConnectAccount,
  getConnectAccountStatus,
  getHostEarnings,
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  handleWebhook,
} from '../controllers/paymentController';

const router = Router();

// Stripe Connect routes
router.post('/connect/create', protect, createConnectAccount);
router.get('/connect/status', protect, getConnectAccountStatus);

// Host earnings (revenue dashboard)
router.get('/earnings', protect, getHostEarnings);

// Payment routes
router.route('/').get(protect, getPaymentHistory).post(protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

// Webhook route (raw body is handled in index.ts)
router.post('/webhook', handleWebhook);

export { router as paymentRoutes }; 