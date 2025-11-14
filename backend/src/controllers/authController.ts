import { Request, Response } from 'express';
import { SupabaseAuthService } from '../services/supabaseService';
import { sendWelcomeEmail } from '../services/emailService';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, isHost } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required',
      });
      return;
    }

    // Register user with Supabase
    const { user, error } = await SupabaseAuthService.registerUser({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
      isHost: isHost || false,
    });

    if (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
      return;
    }

    if (!user) {
      res.status(500).json({
        success: false,
        message: 'User creation failed',
      });
      return;
    }

    // Generate JWT token using Supabase
    const { user: authUser, token: authToken, error: authError } = await SupabaseAuthService.loginUser(email, password);

    if (authError || !authUser || !authToken) {
      res.status(500).json({
        success: false,
        message: 'Login after registration failed',
      });
      return;
    }

    // Send welcome email (don't wait for it - fire and forget)
    sendWelcomeEmail(user.email, user.first_name).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    // Return user data and token
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          phone: user.phone,
          isVerified: user.is_verified,
          isHost: user.is_host,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.created_at,
        },
        token: authToken, // Use the actual JWT token from Supabase
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    // Login user with Supabase
    const { user, token, error } = await SupabaseAuthService.loginUser(email, password);

    if (error) {
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
      });
      return;
    }

    if (!user || !token) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials or token generation failed',
      });
      return;
    }

    // Return user data and token
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          phone: user.phone,
          isVerified: user.is_verified,
          isHost: user.is_host,
          avatar: user.avatar,
          role: user.role,
        },
        token: token, // Use the actual JWT token from Supabase
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Get user profile from Supabase
    const { user, error } = await SupabaseAuthService.getUserById(req.user.id);

    if (error || !user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Return user data
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          phone: user.phone,
          avatar: user.avatar,
          bio: user.bio,
          address: user.address,
          city: user.city,
          state: user.state,
          zipCode: user.zip_code,
          country: user.country,
          isVerified: user.is_verified,
          isHost: user.is_host,
          role: user.role,
          createdAt: user.created_at,
          hostProfile: user.is_host ? {
            // You can add host profile data here if needed
            businessName: null,
            autoAcceptBookings: false,
            responseTime: null,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const {
      firstName,
      lastName,
      phone,
      bio,
      address,
      city,
      state,
      zipCode,
      country,
    } = req.body;

    // Update user profile in Supabase
    const { user, error } = await SupabaseAuthService.updateUserProfile(req.user.id, {
      first_name: firstName,
      last_name: lastName,
      phone,
      bio,
      address,
      city,
      state,
      zip_code: zipCode,
      country,
    });

    if (error || !user) {
      res.status(400).json({
        success: false,
        message: error?.message || 'Profile update failed',
      });
      return;
    }

    // Return updated user data
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zip_code,
        country: user.country,
        isVerified: user.is_verified,
        isHost: user.is_host,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Get the token from headers
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Logout from Supabase
      await SupabaseAuthService.logoutUser(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
}; 