import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

// TODO: Implement message controllers
const getMessages = (req: any, res: any) => {
  res.json({ message: 'Get messages' });
};

const getConversation = (req: any, res: any) => {
  res.json({ message: 'Get conversation' });
};

const sendMessage = (req: any, res: any) => {
  res.json({ message: 'Send message' });
};

// Routes
router.get('/', protect, getMessages);
router.get('/:conversationId', protect, getConversation);
router.post('/', protect, sendMessage);

export { router as messageRoutes }; 