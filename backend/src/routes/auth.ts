import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, updateProfile, logout, confirmEmail, confirmEmailFromAccessToken, forgotPassword, resetPassword, uploadAvatar, googleAuth, resendConfirmation } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

// Stricter rate limit for auth (brute-force protection)
const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min per IP for login/register
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resend confirmation: limit to 3 per 15 min per IP
const resendConfirmationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('province').optional().isString().trim(),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('token_hash').notEmpty().withMessage('Token hash is required'),
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// Routes
router.post('/register', authStrictLimiter, registerValidation, validate, register);
router.post('/login', authStrictLimiter, loginValidation, validate, login);
router.post('/google', authStrictLimiter, googleAuth);
router.get('/confirm-email', confirmEmail);
router.post('/confirm-email', confirmEmailFromAccessToken);
router.post('/resend-confirmation', resendConfirmationLimiter, body('email').isEmail().withMessage('Valid email required'), validate, resendConfirmation);
router.post('/forgot-password', authStrictLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/logout', protect, logout);

export { router as authRoutes }; 