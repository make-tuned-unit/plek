import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

// TODO: Implement notification controllers
const getNotifications = (req: any, res: any) => {
  res.json({ message: 'Get notifications' });
};

const markAsRead = (req: any, res: any) => {
  res.json({ message: 'Mark as read' });
};

// Routes
router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);

export { router as notificationRoutes }; 