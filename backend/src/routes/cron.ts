import { Router } from 'express';
import { runBookingEmailJob } from '../controllers/bookingEmailJobController';

const router = Router();

router.get('/booking-emails', runBookingEmailJob);
router.post('/booking-emails', runBookingEmailJob);

export { router as cronRoutes };
