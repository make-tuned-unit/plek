import { Router } from 'express';
import { handleResendInbound } from '../controllers/resendInboundController';

const router = Router();

router.post('/', handleResendInbound);

export { router as webhooksRoutes };
