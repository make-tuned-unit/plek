import { Router } from 'express';
import { protect } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { getAdminStats } from '../controllers/adminStatsController';
import { getAdminTaxConfig } from '../controllers/adminTaxConfigController';
import { getCrmUsers, getCrmUserDetail, sendCrmEmail } from '../controllers/adminCrmController';

const router = Router();

router.get('/stats', protect, requireAdmin, getAdminStats);
router.get('/tax-config', protect, requireAdmin, getAdminTaxConfig);

// CRM routes
router.get('/crm/users', protect, requireAdmin, getCrmUsers);
router.get('/crm/users/:id', protect, requireAdmin, getCrmUserDetail);
router.post('/crm/users/:id/email', protect, requireAdmin, sendCrmEmail);

export { router as adminRoutes };
