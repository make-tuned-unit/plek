import { Request, Response } from 'express';
import { SupabaseAuthService, getSupabaseClient } from '../services/supabaseService';
import { sendEmailConfirmationEmail, sendPasswordResetEmail } from '../services/emailService';

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
      console.error('Registration error:', error);
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

    // Generate email confirmation link and send via Resend (NOT Supabase email service)
    // All plekk emails use Resend for consistent branding and messaging control
    // Supabase's generateLink only creates the token - we send the email ourselves
    let emailSent = false;
    try {
      console.log(`[Registration] Attempting to generate confirmation link for ${email}`);
      const { link: confirmationLink, error: linkError } = await SupabaseAuthService.generateEmailConfirmationLink(email, user.id);

      if (linkError) {
        console.error('[Registration] Failed to generate confirmation link:', JSON.stringify(linkError, null, 2));
      } else if (!confirmationLink) {
        console.error('[Registration] No confirmation link returned from generateEmailConfirmationLink');
      } else {
        console.log(`[Registration] Confirmation link generated: ${confirmationLink.substring(0, 50)}...`);
        try {
          // Send email via Resend (our branded email service)
          await sendEmailConfirmationEmail(user.email, user.first_name, confirmationLink);
          emailSent = true;
          console.log(`[Registration] Confirmation email sent successfully via Resend to ${email}`);
        } catch (emailSendError: any) {
          console.error('[Registration] Failed to send confirmation email via Resend:', emailSendError?.message || emailSendError);
          console.error('[Registration] Email send error stack:', emailSendError?.stack);
        }
      }
    } catch (emailError: any) {
      console.error('[Registration] Email confirmation setup error:', emailError?.message || emailError);
      console.error('[Registration] Email error stack:', emailError?.stack);
    }

    // Return success message (don't return token - user needs to confirm email first)
    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Account created successfully! Please check your email to confirm your account.'
        : 'Account created successfully! However, we were unable to send the confirmation email. Please contact support or try signing in to request a new confirmation email.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          phone: user.phone,
          isVerified: false, // Not verified until email is confirmed
          isHost: user.is_host,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({
      success: false,
      message: error?.message || 'Server error',
      ...(process.env['NODE_ENV'] === 'development' && { stack: error?.stack }),
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

// @desc    Upload user avatar
// @route   POST /api/auth/avatar
// @access  Private
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    const userId = req.user.id;
    const supabase = getSupabaseClient();

    // Generate unique filename
    const fileExt = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `avatars/${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload to Supabase Storage (use property-photos bucket or create avatars bucket)
    const bucketName = process.env['SUPABASE_STORAGE_BUCKET'] || 'property-photos';
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true, // Allow overwriting existing avatars
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      res.status(500).json({
        success: false,
        error: 'Failed to upload avatar',
        message: uploadError.message,
      });
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Update user's avatar in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating avatar in database:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update avatar',
        message: updateError.message,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        avatar: publicUrl,
      },
    });
  } catch (error: any) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
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

// @desc    Confirm email and log user in
// @route   GET /api/auth/confirm-email
// @access  Public
export const confirmEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token_hash, token, type, email } = req.query;
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

    console.log('Confirmation request params:', { token_hash: !!token_hash, token: !!token, type, email });

    const client = getSupabaseClient();

    // If we have token_hash and token, verify them
    if (token_hash && token) {
      try {
        // Verify the token using Supabase
        // Use 'signup' type for email confirmation (not 'email')
        const { data: verifyData, error: verifyError } = await client.auth.admin.verifyOtp({
          type: (type as string) === 'signup' ? 'signup' : 'email',
          token_hash: token_hash as string,
          token: token as string,
        });

        if (verifyError || !verifyData.user) {
          console.error('[Email Confirmation] Token verification error:', verifyError);
          console.error('[Email Confirmation] Verify data:', verifyData);
          res.redirect(`${frontendUrl}/auth/confirm-email?success=false&error=invalid`);
          return;
        }

        // Update user to verified in our users table
        const { error: profileError } = await client
          .from('users')
          .update({ is_verified: true, updated_at: new Date().toISOString() })
          .eq('id', verifyData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          res.redirect(`${frontendUrl}/auth/confirm-email?success=false&error=profile`);
          return;
        }

        // Send welcome email after successful email confirmation
        try {
          const { sendWelcomeEmail } = await import('../services/emailService');
          const { data: userData } = await client
            .from('users')
            .select('email, first_name')
            .eq('id', verifyData.user.id)
            .single();
          
          if (userData && userData.email && userData.first_name) {
            sendWelcomeEmail(userData.email, userData.first_name).catch((error) => {
              console.error('[Email Confirmation] Failed to send welcome email:', error);
              // Don't fail the confirmation if welcome email fails
            });
          }
        } catch (welcomeEmailError) {
          console.error('[Email Confirmation] Error sending welcome email:', welcomeEmailError);
          // Don't fail the confirmation if welcome email fails
        }

        // Create a session for the user
        const { data: session, error: sessionCreateError } = await client.auth.admin.createSession({
          userId: verifyData.user.id,
        });

        if (sessionCreateError || !session?.session?.access_token) {
          console.error('Session creation error:', sessionCreateError);
          res.redirect(`${frontendUrl}/auth/confirm-email?success=true&error=session`);
          return;
        }

        // Redirect to frontend with token
        res.redirect(`${frontendUrl}/auth/confirm-email?token=${session.session.access_token}&success=true`);
        return;
      } catch (error: any) {
        console.error('Confirmation processing error:', error);
        res.redirect(`${frontendUrl}/auth/confirm-email?success=false&error=server`);
        return;
      }
    }

    // If we have email but no tokens, Supabase may have already verified
    // Try to find the user and confirm them
    if (email) {
      try {
        const { data: users, error: findError } = await client
          .from('users')
          .select('*')
          .eq('email', email as string)
          .limit(1);

        if (!findError && users && users.length > 0) {
          const user = users[0];
          
          // Update to verified
          await client
            .from('users')
            .update({ is_verified: true, updated_at: new Date().toISOString() })
            .eq('id', user.id);

          // Send welcome email after successful email confirmation
          try {
            const { sendWelcomeEmail } = await import('../services/emailService');
            if (user.email && user.first_name) {
              sendWelcomeEmail(user.email, user.first_name).catch((error) => {
                console.error('[Email Confirmation] Failed to send welcome email:', error);
                // Don't fail the confirmation if welcome email fails
              });
            }
          } catch (welcomeEmailError) {
            console.error('[Email Confirmation] Error sending welcome email:', welcomeEmailError);
            // Don't fail the confirmation if welcome email fails
          }

          // Try to create a session
          const { data: session, error: sessionError } = await client.auth.admin.createSession({
            userId: user.id,
          });

          if (!sessionError && session?.session?.access_token) {
            res.redirect(`${frontendUrl}/auth/confirm-email?token=${session.session.access_token}&success=true`);
            return;
          }
        }
      } catch (error: any) {
        console.error('Email-based confirmation error:', error);
      }
    }

    // If we get here, something went wrong
    res.redirect(`${frontendUrl}/auth/confirm-email?success=false&error=missing_params`);
  } catch (error: any) {
    console.error('Email confirmation error:', error);
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/confirm-email?success=false&error=server`);
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

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const client = getSupabaseClient();

    // Check if user exists
    const { data: users, error: findError } = await client
      .from('users')
      .select('id, email, first_name')
      .eq('email', email)
      .limit(1);

    if (findError || !users || users.length === 0) {
      // Don't reveal if email exists for security
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    const user = users[0];

    // Generate password reset link using Supabase
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const { data: resetData, error: resetError } = await client.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${frontendUrl}/auth/reset-password`,
      },
    });

    if (resetError || !resetData) {
      console.error('[Password Reset] Failed to generate reset link:', resetError);
      // Don't reveal error to user for security
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Extract tokens from Supabase's response
    const hashedToken = resetData.properties?.hashed_token;
    const recoveryToken = resetData.properties?.recovery_token;

    if (!hashedToken || !recoveryToken) {
      console.error('[Password Reset] No tokens in Supabase response');
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Construct reset link pointing to our backend endpoint
    const resetLink = `${frontendUrl}/api/auth/reset-password?token_hash=${hashedToken}&token=${recoveryToken}&type=recovery&email=${encodeURIComponent(email)}`;

    // Send password reset email via Resend
    try {
      await sendPasswordResetEmail(user.email, user.first_name, resetLink);
      console.log(`[Password Reset] Reset email sent successfully to ${email}`);
    } catch (emailError: any) {
      console.error('[Password Reset] Failed to send reset email:', emailError);
      // Don't reveal error to user for security
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    // Don't reveal error details for security
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token_hash, token, type, email, newPassword } = req.body;

    if (!token_hash || !token || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
      return;
    }

    const client = getSupabaseClient();

    // Verify the token using Supabase
    const { data: verifyData, error: verifyError } = await client.auth.admin.verifyOtp({
      type: (type as string) === 'recovery' ? 'recovery' : 'email',
      token_hash: token_hash as string,
      token: token as string,
    });

    if (verifyError || !verifyData.user) {
      console.error('[Password Reset] Token verification error:', verifyError);
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
      return;
    }

    // Update password using Supabase admin API
    const { data: updateData, error: updateError } = await client.auth.admin.updateUserById(
      verifyData.user.id,
      {
        password: newPassword,
      }
    );

    if (updateError || !updateData.user) {
      console.error('[Password Reset] Password update error:', updateError);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password. Please try again.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.',
    });
  }
}; 