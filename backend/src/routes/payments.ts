import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createConnectAccount,
  getConnectAccountStatus,
  disconnectConnectAccount,
  getHostEarnings,
  getRefundEligibleBookings,
  processRefund,
  declineRefund,
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getTaxStatus,
  handleWebhook,
} from '../controllers/paymentController';

const router = Router();

// Stripe Connect routes
router.post('/connect/create', protect, createConnectAccount);
router.get('/connect/status', protect, getConnectAccountStatus);
router.post('/connect/disconnect', protect, disconnectConnectAccount);

// Host earnings (revenue dashboard)
router.get('/earnings', protect, getHostEarnings);

// Host refund management (cancelled bookings where host can issue full/partial/no refund)
router.get('/refund-eligible', protect, getRefundEligibleBookings);
router.post('/refund/:bookingId', protect, processRefund);
router.post('/refund/:bookingId/decline', protect, declineRefund);

// Payment routes
router.get('/tax-status', getTaxStatus);
router.route('/').get(protect, getPaymentHistory).post(protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

// Webhook route (raw body is handled in index.ts)
router.post('/webhook', handleWebhook);

export { router as paymentRoutes }; 