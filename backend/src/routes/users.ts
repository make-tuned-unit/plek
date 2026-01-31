import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth';
import { getUsers, getUser } from '../controllers/userController';

const router = Router();

// Routes - list/search users is admin only; get by id is protect (admin or self)
router.route('/').get(protect, requireAdmin, getUsers);
router.get('/:id', protect, getUser);

export { router as userRoutes }; 