import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth';
import { getAdminStats } from '../controllers/adminStatsController';
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getVerificationDetails,
} from '../controllers/adminVerificationController';

const router = Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(requireAdmin);

// Stats/KPIs
router.get('/stats', getAdminStats);

// Verification management (admin only)
router.get('/verifications/pending', getPendingVerifications);
router.get('/verifications/:id', getVerificationDetails);
router.post('/verifications/:id/approve', approveVerification);
router.post('/verifications/:id/reject', rejectVerification);

export { router as adminRoutes };



