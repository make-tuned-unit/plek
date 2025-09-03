import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

const getNotifications = (_req: any, res: any) => {
  res.json({ message: 'Get all notifications' });
};

const markAsRead = (_req: any, res: any) => {
  res.json({ message: 'Mark notification as read' });
};

// Routes
router.route('/').get(protect, getNotifications);
router.patch('/:id/read', protect, markAsRead);

export { router as notificationRoutes }; 