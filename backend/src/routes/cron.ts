import { Router } from 'express';
import { runBookingEmailJob } from '../controllers/bookingEmailJobController';
import { runTaxRevenueSync } from '../controllers/taxRevenueSyncController';

const router = Router();

router.get('/booking-emails', runBookingEmailJob);
router.post('/booking-emails', runBookingEmailJob);
router.get('/sync-tax-revenue', runTaxRevenueSync);
router.post('/sync-tax-revenue', runTaxRevenueSync);

export { router as cronRoutes };
