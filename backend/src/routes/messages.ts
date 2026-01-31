import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth';
import { getMessages, sendMessage, getBookingMessages, getConversation, getDirectMessages } from '../controllers/messageController';

const router = Router();

// Routes
router.route('/').get(protect, getMessages).post(protect, sendMessage);
router.get('/booking/:bookingId', protect, getBookingMessages);
router.get('/conversation/:id', protect, getConversation);
router.get('/direct/:userId', protect, requireAdmin, getDirectMessages);

export { router as messageRoutes }; 