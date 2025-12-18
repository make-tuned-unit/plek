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
import { reviewRoutes } from './routes/reviews';
import { adminRoutes } from './routes/admin';
import { verificationRoutes } from './routes/verification';
import { initializeSupabase } from './services/supabaseService';

// Load environment variables
dotenv.config();

// Initialize Supabase
initializeSupabase();

const app = express();
const PORT = parseInt(process.env['PORT'] || '8000', 10);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env['FRONTEND_URL'] || 'http://localhost:3000',
      'http://localhost:3001',
      'https://staging.parkplekk.com',
      'https://drivemyway-frontend-production.up.railway.app',
    ];
    
    // Check if origin matches allowed origins or patterns
    if (allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.parkplekk\.com$/.test(origin) ||
        /^https:\/\/.*\.railway\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use('/api/reviews', reviewRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env['NODE_ENV']}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 CORS allowed origins: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}`);
});

export default app; 