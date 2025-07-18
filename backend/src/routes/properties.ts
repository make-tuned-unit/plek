import { Router } from 'express';
import { protect, requireHost } from '../middleware/auth';

const router = Router();

// TODO: Implement property controllers
const getProperties = (req: any, res: any) => {
  res.json({ message: 'Get properties' });
};

const getProperty = (req: any, res: any) => {
  res.json({ message: 'Get property' });
};

const createProperty = (req: any, res: any) => {
  res.json({ message: 'Create property' });
};

const updateProperty = (req: any, res: any) => {
  res.json({ message: 'Update property' });
};

const deleteProperty = (req: any, res: any) => {
  res.json({ message: 'Delete property' });
};

// Routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.post('/', protect, requireHost, createProperty);
router.put('/:id', protect, requireHost, updateProperty);
router.delete('/:id', protect, requireHost, deleteProperty);

export { router as propertyRoutes }; 