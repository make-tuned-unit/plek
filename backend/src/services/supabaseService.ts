import { createClient } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';

// Types for our database
export interface DatabaseUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  is_verified: boolean;
  is_host: boolean;
  role: 'user' | 'host' | 'admin' | 'super_admin';
  stripe_customer_id?: string;
  stripe_account_id?: string;
  total_bookings: number;
  total_earnings: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  isHost?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

// Initialize Supabase client
let supabase: any = null;

export function initializeSupabase() {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
  }
  
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabase;
}

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Call initializeSupabase() first.');
  }
  return supabase;
}

// Auth functions
export class SupabaseAuthService {
  /**
   * Register a new user
   */
  static async registerUser(userData: CreateUserData): Promise<{ user: DatabaseUser | null; error: AuthError | null }> {
    try {
      const client = getSupabaseClient();
      
      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
      
      // Create user in Supabase Auth (email confirmation required)
      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: false, // Require email confirmation
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
        },
        email_redirect_to: `${frontendUrl}/auth/confirm-email`, // Where to redirect after confirmation
      });

      if (authError) {
        return { user: null, error: authError };
      }

      if (!authData.user) {
        return { user: null, error: { message: 'User creation failed', name: 'UserCreationError', status: 500 } as AuthError };
      }

      // Create user profile in our users table
      const { data: profileData, error: profileError } = await client
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          role: 'user',
          is_verified: false, // Require email confirmation
          is_host: userData.isHost || false,
          total_bookings: 0,
          total_earnings: 0,
          rating: 0,
          review_count: 0,
          country: 'US',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, delete the auth user
        await client.auth.admin.deleteUser(authData.user.id);
        return { user: null, error: { message: profileError.message, name: 'ProfileCreationError', status: 500 } as AuthError };
      }

      return { user: profileData, error: null };
    } catch (error: any) {
      console.error('Supabase registration error:', error);
      return { 
        user: null, 
        error: { message: `Internal server error: ${error?.message || 'Unknown error'}`, name: 'InternalError', status: 500 } as AuthError 
      };
    }
  }

  /**
   * Login user
   */
  static async loginUser(email: string, password: string): Promise<{ user: DatabaseUser | null; token: string | null; error: AuthError | null }> {
    try {
      const supabaseUrl = process.env['SUPABASE_URL'];
      const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
      
      if (!supabaseUrl || !serviceKey) {
        return { user: null, token: null, error: { message: 'Supabase configuration missing', name: 'ConfigError', status: 500 } as AuthError };
      }
      
      const authClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      
      // Authenticate with Supabase
      const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { user: null, token: null, error: authError };
      }

      if (!authData.user) {
        return { user: null, token: null, error: { message: 'Login failed', name: 'LoginError', status: 500 } as AuthError };
      }

      // Get user profile from our users table
      const adminClient = getSupabaseClient();
      const { data: profileData, error: profileError } = await adminClient
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        return { user: null, token: null, error: { message: profileError.message, name: 'ProfileError', status: 500 } as AuthError };
      }

      return { user: profileData, token: authData.session?.access_token || null, error: null };
    } catch (error) {
      return { 
        user: null, 
        token: null, 
        error: { message: 'Internal server error', name: 'InternalError', status: 500 } as AuthError 
      };
    }
  }

  /**
   * Generate email confirmation link using Supabase admin API
   * This generates a link WITHOUT sending an email through Supabase
   * We send the email ourselves via Resend for branding control
   */
  static async generateEmailConfirmationLink(email: string, userId: string): Promise<{ link: string | null; error: AuthError | null }> {
    try {
      const client = getSupabaseClient();
      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
      
      // Generate a signup link using Supabase admin API
      // This creates the token but doesn't send an email (we'll send via Resend)
      const result = await client.auth.admin.generateLink({
        type: 'signup',
        email: email,
        options: {
          redirectTo: `${frontendUrl}/auth/confirm-email`,
        },
      });

      if (result.error) {
        console.error('[Email] Supabase generateLink error:', JSON.stringify(result.error, null, 2));
        return { link: null, error: result.error };
      }

      if (!result.data) {
        console.error('[Email] No data returned from generateLink');
        return { 
          link: null, 
          error: { message: 'Failed to generate confirmation link - no data returned', name: 'LinkGenerationError', status: 500 } as AuthError 
        };
      }

      // Extract tokens from Supabase's response
      // We'll construct our own link pointing to our backend endpoint
      const hashedToken = result.data.properties?.hashed_token;
      const verificationToken = result.data.properties?.verification_token;
      
      if (!hashedToken || !verificationToken) {
        console.error('[Email] No tokens in Supabase response. Full data:', JSON.stringify(result.data, null, 2));
        
        // Fallback: try to use action_link if available
        const actionLink = result.data.properties?.action_link;
        if (actionLink) {
          console.log('[Email] Using Supabase action_link as fallback');
          return { link: actionLink, error: null };
        }
        
        return { 
          link: null, 
          error: { message: 'Failed to generate confirmation link - no tokens in response', name: 'LinkGenerationError', status: 500 } as AuthError 
        };
      }

      // Construct link pointing to our backend endpoint via frontend API proxy
      // Using frontend URL ensures it works with ngrok and Next.js rewrites
      // The backend will verify the token and redirect to frontend with session token
      const confirmationLink = `${frontendUrl}/api/auth/confirm-email?token_hash=${hashedToken}&token=${verificationToken}&type=signup&email=${encodeURIComponent(email)}`;
      
      console.log(`[Email] Successfully generated confirmation link for ${email}`);
      return { link: confirmationLink, error: null };
    } catch (error: any) {
      console.error('[Email] Supabase generate link error:', error);
      console.error('[Email] Error stack:', error?.stack);
      return { 
        link: null, 
        error: { message: `Failed to generate confirmation link: ${error?.message || 'Unknown error'}`, name: 'LinkGenerationError', status: 500 } as AuthError 
      };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<{ user: DatabaseUser | null; error: AuthError | null }> {
    try {
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { user: null, error: { message: error.message, name: 'UserNotFoundError', status: 404 } as AuthError };
      }

      return { user: data, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: 'Internal server error', name: 'InternalError', status: 500 } as AuthError 
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updateData: UpdateUserData): Promise<{ user: DatabaseUser | null; error: AuthError | null }> {
    try {
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('users')
        .update(updateData as any)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { user: null, error: { message: error.message, name: 'UpdateError', status: 400 } as AuthError };
      }

      return { user: data, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: 'Internal server error', name: 'InternalError', status: 500 } as AuthError 
      };
    }
  }

  /**
   * Verify JWT token and get user
   */
  static async verifyToken(token: string): Promise<{ user: DatabaseUser | null; error: AuthError | null }> {
    try {
      const supabaseUrl = process.env['SUPABASE_URL'];
      const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
      
      if (!supabaseUrl || !serviceKey) {
        return { 
          user: null, 
          error: { message: 'Supabase configuration missing', name: 'ConfigError', status: 500 } as AuthError 
        };
      }
      
      // Use a dedicated client for auth verification to avoid mutating the global service client
      const authClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      
      // Verify the token with Supabase
      const { data: { user }, error } = await authClient.auth.getUser(token);

      if (error || !user) {
        return { user: null, error: error || { message: 'Invalid token', name: 'InvalidToken', status: 401 } as AuthError };
      }

      // Get user profile from our users table
      const adminClient = getSupabaseClient();
      const { data: profileData, error: profileError } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return { user: null, error: { message: profileError.message, name: 'ProfileError', status: 500 } as AuthError };
      }

      return { user: profileData, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: 'Internal server error', name: 'InternalError', status: 500 } as AuthError 
      };
    }
  }

  /**
   * Logout user
   */
  static async logoutUser(token: string): Promise<{ error: AuthError | null }> {
    try {
      const client = getSupabaseClient();
      
      const { error } = await client.auth.admin.signOut(token);
      return { error };
    } catch (error) {
      return { 
        error: { message: 'Internal server error', name: 'InternalError', status: 500 } as AuthError 
      };
    }
  }
}

// Database functions
export class SupabaseDatabaseService {
  /**
   * Create a new property
   */
  static async createProperty(propertyData: any): Promise<{ property: any | null; error: any }> {
    try {
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('properties')
        .insert(propertyData)
        .select()
        .single();

      return { property: data, error };
    } catch (error) {
      return { property: null, error };
    }
  }

  /**
   * Get properties with filters
   */
  static async getProperties(filters: any = {}): Promise<{ properties: any[] | null; error: any }> {
    try {
      const client = getSupabaseClient();
      
      let query = client
        .from('properties')
        .select('*, users!properties_host_id_fkey(first_name, last_name, rating, review_count)');

      // Apply filters
      if (filters.city) query = query.eq('city', filters.city);
      if (filters.state) query = query.eq('state', filters.state);
      if (filters.property_type) query = query.eq('property_type', filters.property_type);
      if (filters.max_price) query = query.lte('hourly_rate', filters.max_price);
      if (filters.min_price) query = query.gte('hourly_rate', filters.min_price);

      const { data, error } = await query;

      return { properties: data, error };
    } catch (error) {
      return { properties: null, error };
    }
  }

  /**
   * Create a new booking
   */
  static async createBooking(bookingData: any): Promise<{ booking: any | null; error: any }> {
    try {
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      return { booking: data, error };
    } catch (error) {
      return { booking: null, error };
    }
  }

  /**
   * Get user bookings
   */
  static async getUserBookings(userId: string, role: 'renter' | 'host' = 'renter'): Promise<{ bookings: any[] | null; error: any }> {
    try {
      const client = getSupabaseClient();
      
      const column = role === 'renter' ? 'renter_id' : 'host_id';
      
      const { data, error } = await client
        .from('bookings')
        .select(`
          *,
          properties!bookings_property_id_fkey(*),
          users!bookings_renter_id_fkey(first_name, last_name),
          users!bookings_host_id_fkey(first_name, last_name)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false });

      return { bookings: data, error };
    } catch (error) {
      return { bookings: null, error };
    }
  }
}

export default { initializeSupabase, getSupabaseClient };
