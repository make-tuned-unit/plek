import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  submitIdentityVerification,
  getVerificationStatusEndpoint,
  getVerificationHistory,
} from '../controllers/verificationController';

const router = Router();

// All verification routes require authentication
router.use(protect);

// Verification routes
router.post('/submit-identity', submitIdentityVerification);
router.get('/status', getVerificationStatusEndpoint);
router.get('/history', getVerificationHistory);

export { router as verificationRoutes };

