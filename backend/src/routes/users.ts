import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth';

const router = Router();

const getUsers = (_req: any, res: any) => {
  res.json({ message: 'Get all users' });
};

const getUser = (_req: any, res: any) => {
  res.json({ message: 'Get user by ID' });
};

// Routes
router.route('/').get(protect, requireAdmin, getUsers);
router.get('/:id', protect, getUser);

export { router as userRoutes }; 