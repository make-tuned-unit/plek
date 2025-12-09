import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { isRead, type, limit = 50 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string, 10));

    if (isRead !== undefined) {
      query = query.eq('is_read', isRead === 'true');
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
      });
      return;
    }

    res.json({
      success: true,
      data: notifications || [],
    });
  } catch (error: any) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { id } = req.params;

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
      return;
    }

    if (notification.user_id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to update this notification',
      });
      return;
    }

    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating notification:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update notification',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedNotification,
    });
  } catch (error: any) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (updateError) {
      console.error('Error updating notifications:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update notifications',
      });
      return;
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (countError) {
      console.error('Error counting notifications:', countError);
      res.status(500).json({
        success: false,
        error: 'Failed to count notifications',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        count: count || 0,
      },
    });
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

