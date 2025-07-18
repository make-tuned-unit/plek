import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

// TODO: Implement user controllers
const getUsers = (req: any, res: any) => {
  res.json({ message: 'Get users' });
};

const getUser = (req: any, res: any) => {
  res.json({ message: 'Get user' });
};

// Routes
router.get('/', protect, getUsers);
router.get('/:id', protect, getUser);

export { router as userRoutes }; 