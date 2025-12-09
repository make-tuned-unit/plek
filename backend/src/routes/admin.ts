import { Router } from 'express';
import { protect } from '../middleware/auth';
import { getAdminStats } from '../controllers/adminStatsController';

const router = Router();

// All admin routes require authentication
router.use(protect);

// Stats/KPIs
router.get('/stats', getAdminStats);

export { router as adminRoutes };

