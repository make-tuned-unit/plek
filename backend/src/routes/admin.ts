import { Router } from 'express';
import { protect } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { getAdminStats } from '../controllers/adminStatsController';
import { getAdminTaxConfig } from '../controllers/adminTaxConfigController';

const router = Router();

router.get('/stats', protect, requireAdmin, getAdminStats);
router.get('/tax-config', protect, requireAdmin, getAdminTaxConfig);

export { router as adminRoutes };
