import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../controllers/notificationController';

const router = Router();

// Routes
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);

export { router as notificationRoutes }; 