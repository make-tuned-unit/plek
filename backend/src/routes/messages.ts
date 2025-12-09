import { Router } from 'express';
import { protect } from '../middleware/auth';
import { getMessages, sendMessage, getBookingMessages, getConversation } from '../controllers/messageController';

const router = Router();

// Routes
router.route('/').get(protect, getMessages).post(protect, sendMessage);
router.get('/booking/:bookingId', protect, getBookingMessages);
router.get('/conversation/:id', protect, getConversation);

export { router as messageRoutes }; 