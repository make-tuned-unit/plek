import { Router } from 'express';
import multer from 'multer';
import { protect, requireHost, requireAdmin } from '../middleware/auth';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getUserProperties,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  adminDeleteProperty,
  uploadPropertyPhoto
} from '../controllers/propertyController';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

// Protected routes (must come before /:id to avoid route conflicts)
router.get('/user/my-properties', protect, getUserProperties);

// Admin routes (must come before /:id to avoid route conflicts)
router.get('/admin/pending', protect, requireAdmin, getPendingProperties);

// Public routes
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes
// Allow property creation even if user isn't a host yet (will be set during creation)
router.post('/', protect, createProperty);
router.put('/:id', protect, requireHost, updateProperty);
router.delete('/:id', protect, requireHost, deleteProperty);
router.post('/:id/photos', protect, requireHost, upload.single('photo'), uploadPropertyPhoto);

// Admin routes
router.put('/:id/approve', protect, requireAdmin, approveProperty);
router.put('/:id/reject', protect, requireAdmin, rejectProperty);
router.delete('/:id/admin', protect, requireAdmin, adminDeleteProperty);

export { router as propertyRoutes }; 