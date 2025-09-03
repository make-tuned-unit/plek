import { Request, Response, NextFunction } from 'express';
import { SupabaseAuthService } from '../services/supabaseService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isVerified: boolean;
        isHost: boolean;
        avatar: string | undefined;
        role: string;
      };
    }
  }
}

// Middleware to protect routes - requires valid JWT token
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token with Supabase
      if (!token) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }
      
      const { user, error } = await SupabaseAuthService.verifyToken(token);

      if (error || !user) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      // Set user info in request
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isVerified: user.is_verified,
        isHost: user.is_host,
        avatar: user.avatar || undefined,
        role: user.role,
      };

      next();
      return;
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

// Middleware to require verified account
export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({ message: 'Verified account required' });
    return;
  }

  next();
};

// Middleware to require host role
export const requireHost = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  if (!req.user.isHost) {
    res.status(403).json({ message: 'Host account required' });
    return;
  }

  next();
};

// Middleware to require admin role
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
}; 