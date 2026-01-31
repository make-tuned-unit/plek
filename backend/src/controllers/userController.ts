import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// @desc    Search users (admin only) by email, first name, or last name
// @route   GET /api/users?search=...
// @access  Private (Admin only)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const supabase = getSupabaseClient();

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, created_at, is_host')
      .order('created_at', { ascending: false });

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`
      );
    }

    const { data: users, error } = await query.limit(50);

    if (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search users',
      });
      return;
    }

    res.json({
      success: true,
      data: { users: users || [] },
    });
  } catch (error: any) {
    console.error('Error in getUsers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users',
      message: error.message,
    });
  }
};

// @desc    Get a single user by ID (admin or self)
// @route   GET /api/users/:id
// @access  Private
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestingUserId = (req as any).user.id;
    const isAdmin = (req as any).user.role === 'admin' || (req as any).user.role === 'super_admin';
    const { id } = req.params;
    const supabase = getSupabaseClient();

    if (id !== requestingUserId && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to view this user',
      });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, created_at, is_host, avatar, bio, address, city, state, zip_code, country')
      .eq('id', id)
      .single();

    if (error || !user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error('Error in getUser:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message,
    });
  }
};
