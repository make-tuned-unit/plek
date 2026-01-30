import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authRoutes } from './routes/auth';
import { propertyRoutes } from './routes/properties';
import { bookingRoutes } from './routes/bookings';
import { messageRoutes } from './routes/messages';
import { paymentRoutes } from './routes/payments';
import { userRoutes } from './routes/users';
import { notificationRoutes } from './routes/notifications';
import { webhooksRoutes } from './routes/webhooks';
import { contactRoutes } from './routes/contact';
import { initializeSupabase } from './services/supabaseService';

// Load environment variables
dotenv.config();

// Initialize Supabase
initializeSupabase();

// Ensure production uses a public FRONTEND_URL for email links (confirm, reset, etc.)
const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
if (process.env['NODE_ENV'] === 'production' && (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1'))) {
  console.warn(
    '[CONFIG] FRONTEND_URL is localhost in production. Email confirmation and password reset links will not work for users. Set FRONTEND_URL to your public app URL (e.g. https://plekk.com) in the backend environment.'
  );
}

const app = express();
const PORT = process.env['PORT'] || 8000;

// Trust proxy when behind Railway/nginx (needed for rate limit + X-Forwarded-For)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [process.env['FRONTEND_URL'] || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Stripe webhook route (must be before body parsing middleware)
// Webhooks need raw body for signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
// Resend Inbound: forward received emails to INBOUND_FORWARD_TO
app.use('/api/webhooks/resend-inbound', express.raw({ type: 'application/json' }), webhooksRoutes);

// Body parsing middleware
// Note: Don't use body parser for multipart/form-data (file uploads)
// Multer handles that separately
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env['NODE_ENV'] === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'],
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env['NODE_ENV']}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app; 