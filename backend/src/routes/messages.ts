import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

const getMessages = (_req: any, res: any) => {
  res.json({ message: 'Get all messages' });
};

const getConversation = (_req: any, res: any) => {
  res.json({ message: 'Get conversation' });
};

const sendMessage = (_req: any, res: any) => {
  res.json({ message: 'Send message' });
};

// Routes
router.route('/').get(protect, getMessages).post(protect, sendMessage);
router.get('/conversation/:id', protect, getConversation);

export { router as messageRoutes }; 