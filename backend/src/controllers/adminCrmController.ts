import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import { sendAdminCustomEmail } from '../services/emailService';
import { logger } from '../utils/logger';

/**
 * Derive a funnel stage from user data:
 *  signed_up → verified → listed_or_booked → completed → repeat
 * Also flag friction points.
 */
function deriveFunnelStage(u: any, bookings: any[], properties: any[]) {
  const completed = bookings.filter((b: any) => b.status === 'completed');
  if (completed.length > 1) return 'repeat';
  if (completed.length === 1) return 'completed';
  if (bookings.length > 0 || properties.length > 0) return 'active';
  if (u.is_verified) return 'verified';
  return 'signed_up';
}

function detectFriction(u: any, bookings: any[], properties: any[]) {
  const flags: string[] = [];
  if (!u.is_verified) {
    const hoursSinceSignup = (Date.now() - new Date(u.created_at).getTime()) / 3_600_000;
    if (hoursSinceSignup > 24) flags.push('unverified_24h');
  }
  if (!u.first_name || !u.last_name) flags.push('incomplete_profile');
  if (!u.phone) flags.push('no_phone');
  const rejected = properties.filter((p: any) => p.status === 'rejected');
  if (rejected.length > 0) flags.push('property_rejected');
  const cancelled = bookings.filter((b: any) => b.status === 'cancelled');
  if (cancelled.length > 0 && bookings.filter((b: any) => b.status === 'completed').length === 0) {
    flags.push('only_cancelled_bookings');
  }
  return flags;
}

// @desc    Get all users with CRM activity data
// @route   GET /api/admin/crm/users
// @access  Private (Admin only)
export const getCrmUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { search, stage, sort, order, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * pageSize;

    // Fetch users
    let userQuery = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      const s = `%${search}%`;
      userQuery = userQuery.or(`email.ilike.${s},first_name.ilike.${s},last_name.ilike.${s}`);
    }

    const sortField = (sort as string) || 'created_at';
    const sortOrder = (order as string) === 'asc';
    const allowedSorts = ['created_at', 'email', 'first_name', 'last_name', 'total_bookings', 'total_earnings', 'rating'];
    const safeSortField = allowedSorts.includes(sortField) ? sortField : 'created_at';

    userQuery = userQuery.order(safeSortField, { ascending: sortOrder });
    userQuery = userQuery.range(offset, offset + pageSize - 1);

    const { data: users, count, error } = await userQuery;
    if (error) throw error;

    if (!users || users.length === 0) {
      res.json({ success: true, data: { users: [], total: 0, page: pageNum, pageSize } });
      return;
    }

    const userIds = users.map((u: any) => u.id);

    // Fetch bookings and properties for these users in parallel
    const [bookingsResult, propertiesResult, messagesResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, renter_id, host_id, status, created_at, total_amount')
        .or(`renter_id.in.(${userIds.join(',')}),host_id.in.(${userIds.join(',')})`),
      supabase
        .from('properties')
        .select('id, user_id, status, created_at')
        .in('user_id', userIds),
      supabase
        .from('messages')
        .select('id, sender_id, receiver_id, created_at')
        .or(`sender_id.in.(${userIds.join(',')}),receiver_id.in.(${userIds.join(',')})`),
    ]);

    const allBookings = bookingsResult.data || [];
    const allProperties = propertiesResult.data || [];
    const allMessages = messagesResult.data || [];

    const enrichedUsers = users.map((u: any) => {
      const userBookings = allBookings.filter(
        (b: any) => b.renter_id === u.id || b.host_id === u.id
      );
      const userProperties = allProperties.filter((p: any) => p.user_id === u.id);
      const userMessages = allMessages.filter(
        (m: any) => m.sender_id === u.id || m.receiver_id === u.id
      );

      const lastActivity = [
        ...userBookings.map((b: any) => b.created_at),
        ...userMessages.map((m: any) => m.created_at),
        u.updated_at,
      ]
        .filter(Boolean)
        .sort()
        .reverse()[0] || u.created_at;

      return {
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        is_host: u.is_host,
        host_type: u.host_type,
        is_verified: u.is_verified,
        city: u.city,
        state: u.state,
        created_at: u.created_at,
        last_activity: lastActivity,
        total_bookings: userBookings.length,
        completed_bookings: userBookings.filter((b: any) => b.status === 'completed').length,
        total_properties: userProperties.length,
        active_properties: userProperties.filter((p: any) => p.status === 'active').length,
        total_messages: userMessages.length,
        total_earnings: u.total_earnings || 0,
        rating: u.rating || 0,
        review_count: u.review_count || 0,
        funnel_stage: deriveFunnelStage(u, userBookings, userProperties),
        friction_flags: detectFriction(u, userBookings, userProperties),
      };
    });

    // Filter by stage if requested
    let filtered = enrichedUsers;
    if (stage && stage !== 'all') {
      filtered = enrichedUsers.filter((u: any) => u.funnel_stage === stage);
    }

    res.json({
      success: true,
      data: {
        users: filtered,
        total: count || 0,
        page: pageNum,
        pageSize,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching CRM users', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CRM users' });
  }
};

// @desc    Get detailed user profile for CRM
// @route   GET /api/admin/crm/users/:id
// @access  Private (Admin only)
export const getCrmUserDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    // User profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Parallel fetch all related data
    const [bookingsResult, propertiesResult, reviewsResult, notificationsResult, messagesResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, status, created_at, start_time, end_time, total_amount, service_fee, renter_id, host_id, property_id')
        .or(`renter_id.eq.${id},host_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('properties')
        .select('id, title, status, created_at, hourly_rate, address, city, state')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id, reviewee_id')
        .or(`reviewer_id.eq.${id},reviewee_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('notifications')
        .select('id, type, title, message, is_read, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, is_read')
        .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const bookings = bookingsResult.data || [];
    const properties = propertiesResult.data || [];
    const reviews = reviewsResult.data || [];
    const notifications = notificationsResult.data || [];
    const messages = messagesResult.data || [];

    // Build activity timeline
    const timeline: any[] = [];

    timeline.push({ type: 'signup', date: user.created_at, detail: 'Account created' });

    if (user.is_verified) {
      timeline.push({ type: 'verified', date: user.updated_at || user.created_at, detail: 'Email verified' });
    }

    bookings.forEach((b: any) => {
      const role = b.renter_id === id ? 'renter' : 'host';
      timeline.push({
        type: 'booking',
        date: b.created_at,
        detail: `Booking ${b.status} as ${role}`,
        meta: { bookingId: b.id, status: b.status, amount: b.total_amount },
      });
    });

    properties.forEach((p: any) => {
      timeline.push({
        type: 'property',
        date: p.created_at,
        detail: `Listed property: ${p.title}`,
        meta: { propertyId: p.id, status: p.status, title: p.title },
      });
    });

    reviews.forEach((r: any) => {
      const direction = r.reviewer_id === id ? 'left' : 'received';
      timeline.push({
        type: 'review',
        date: r.created_at,
        detail: `Review ${direction} (${r.rating}/5)`,
        meta: { rating: r.rating, comment: r.comment },
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const funnelStage = deriveFunnelStage(user, bookings, properties);
    const frictionFlags = detectFriction(user, bookings, properties);

    // Stats
    const completedBookings = bookings.filter((b: any) => b.status === 'completed');
    const asRenter = bookings.filter((b: any) => b.renter_id === id);
    const asHost = bookings.filter((b: any) => b.host_id === id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          is_host: user.is_host,
          host_type: user.host_type,
          is_verified: user.is_verified,
          address: user.address,
          city: user.city,
          state: user.state,
          zip_code: user.zip_code,
          country: user.country,
          stripe_customer_id: user.stripe_customer_id ? '••••' : null,
          stripe_account_id: user.stripe_account_id ? '••••' : null,
          created_at: user.created_at,
          updated_at: user.updated_at,
          email_notifications_bookings: user.email_notifications_bookings,
          sms_notifications: user.sms_notifications,
          marketing_emails: user.marketing_emails,
        },
        stats: {
          total_bookings: bookings.length,
          completed_bookings: completedBookings.length,
          bookings_as_renter: asRenter.length,
          bookings_as_host: asHost.length,
          total_properties: properties.length,
          active_properties: properties.filter((p: any) => p.status === 'active').length,
          total_earnings: user.total_earnings || 0,
          rating: user.rating || 0,
          review_count: user.review_count || 0,
          total_messages: messages.length,
          unread_notifications: notifications.filter((n: any) => !n.is_read).length,
        },
        funnel_stage: funnelStage,
        friction_flags: frictionFlags,
        timeline,
        bookings,
        properties,
        reviews,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching CRM user detail', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user details' });
  }
};

// @desc    Send custom email to user from admin
// @route   POST /api/admin/crm/users/:id/email
// @access  Private (Admin only)
export const sendCrmEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { subject, body } = req.body;

    if (!subject || !body) {
      res.status(400).json({ success: false, error: 'Subject and body are required' });
      return;
    }

    const { data: targetUser, error } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', id)
      .single();

    if (error || !targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    await sendAdminCustomEmail({
      recipientName: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || 'there',
      recipientEmail: targetUser.email,
      subject,
      body,
    });

    logger.info('[CRM] Admin email sent', { to: targetUser.email, subject });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    logger.error('Error sending CRM email', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
};
