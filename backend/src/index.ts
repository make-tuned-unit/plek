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
import { initializeSupabase } from './services/supabaseService';

// Load environment variables
dotenv.config();

// Initialize Supabase
initializeSupabase();

const app = express();
const PORT = process.env['PORT'] || 8000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env['FRONTEND_URL'] || 'http://localhost:3000',
    'http://localhost:3001',
    'https://staging.parkplekk.com',
    'https://drivemyway-frontend-production.up.railway.app',
    // Allow any subdomain of parkplekk.com for staging
    /^https:\/\/.*\.parkplekk\.com$/,
    // Allow Railway frontend domains
    /^https:\/\/.*\.railway\.app$/,
  ],
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