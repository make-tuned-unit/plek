import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { protect, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getAdminCommercialLeads,
  getCommercialLeadStatus,
  getCommercialTemplate,
  submitCommercialLead,
  updateAdminCommercialLead,
} from '../controllers/commercialController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const commercialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many commercial submissions. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/template', getCommercialTemplate);
router.get('/submissions/:id', getCommercialLeadStatus);
router.post(
  '/submissions',
  protect,
  commercialLimiter,
  upload.single('spreadsheetUpload'),
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('contactName').trim().notEmpty().withMessage('Contact name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('province').trim().notEmpty().withMessage('Province is required'),
    body('propertyType').trim().notEmpty().withMessage('Property type is required'),
    body('authorityConfirmation').custom((value) => value === true || value === 'true').withMessage('Authority confirmation is required'),
    body('insuranceComplianceConfirmation').custom((value) => value === true || value === 'true').withMessage('Insurance/compliance confirmation is required'),
  ],
  validate,
  submitCommercialLead
);

router.get('/admin/submissions', protect, requireAdmin, getAdminCommercialLeads);
router.put('/admin/submissions/:id', protect, requireAdmin, updateAdminCommercialLead);

export { router as commercialRoutes };
