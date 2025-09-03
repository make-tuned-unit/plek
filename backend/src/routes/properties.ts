import { Router } from 'express';
import { protect, requireHost } from '../middleware/auth';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getUserProperties
} from '../controllers/propertyController';

const router = Router();

// Public routes
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes
router.get('/user/my-properties', protect, getUserProperties);
router.post('/', protect, requireHost, createProperty);
router.put('/:id', protect, requireHost, updateProperty);
router.delete('/:id', protect, requireHost, deleteProperty);

export { router as propertyRoutes }; 