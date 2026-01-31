import { Router } from 'express';
import { protect } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { getAdminStats } from '../controllers/adminStatsController';

const router = Router();

router.get('/stats', protect, requireAdmin, getAdminStats);

export { router as adminRoutes };
