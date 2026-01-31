import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// @desc    Get messages for a specific booking
// @route   GET /api/messages/booking/:bookingId
// @access  Private
export const getBookingMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { bookingId } = req.params;
    const supabase = getSupabaseClient();

    if (!bookingId) {
      res.status(400).json({
        success: false,
        error: 'Booking ID is required',
      });
      return;
    }

    // Verify user is part of this booking (either renter or host)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('renter_id, host_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }

    if (booking.renter_id !== userId && booking.host_id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to view messages for this booking',
      });
      return;
    }

    // Get all messages for this booking
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, email, avatar),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, email, avatar)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages',
      });
      return;
    }

    // Mark messages as read if they're received by the current user
    const unreadMessages = (messages || []).filter(
      (msg: any) => (msg.receiver_id || msg.receiverId) === userId && !(msg.is_read || msg.isRead)
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg: any) => msg.id);
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds);
    }

    res.json({
      success: true,
      data: {
        messages: messages || [],
        booking: {
          id: booking.id,
          renterId: booking.renter_id,
          hostId: booking.host_id,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting booking messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
      message: error.message,
    });
  }
};

// @desc    Send a message for a booking, or (admin only) direct message to a user
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const { bookingId, receiverId, content, messageType } = req.body;
    const supabase = getSupabaseClient();

    if (!content || !(content as string).trim()) {
      res.status(400).json({
        success: false,
        error: 'Content is required',
      });
      return;
    }

    // Admin direct message (no booking)
    if (!bookingId && receiverId) {
      if (!isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only admins can send direct messages',
        });
        return;
      }
      if (receiverId === userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot message yourself',
        });
        return;
      }
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', receiverId)
        .single();
      if (userError || !targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          booking_id: null,
          sender_id: userId,
          receiver_id: receiverId,
          content: (content as string).trim(),
          message_type: ((messageType as string) || 'text').toLowerCase(),
          is_read: false,
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, first_name, last_name, email, avatar),
          receiver:users!messages_receiver_id_fkey(id, first_name, last_name, email, avatar)
        `)
        .single();

      if (messageError || !message) {
        console.error('Error creating direct message:', messageError);
        res.status(500).json({
          success: false,
          error: 'Failed to send message',
        });
        return;
      }

      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: 'message_received',
        title: 'Message from support',
        message: `You have a new message from Plek support`,
        data: { direct: true, message_id: message.id },
        is_read: false,
      } as any);

      res.status(201).json({
        success: true,
        data: { message },
      });
      return;
    }

    // Booking-scoped message
    if (!bookingId) {
      res.status(400).json({
        success: false,
        error: 'Booking ID is required for booking messages',
      });
      return;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('renter_id, host_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }

    if (booking.renter_id !== userId && booking.host_id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to send messages for this booking',
      });
      return;
    }

    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: 'Messages can only be sent for confirmed bookings',
      });
      return;
    }

    const receiverIdBooking = booking.renter_id === userId ? booking.host_id : booking.renter_id;

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: userId,
        receiver_id: receiverIdBooking,
        content: (content as string).trim(),
        message_type: ((messageType as string) || 'text').toLowerCase(),
        is_read: false,
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, email, avatar),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, email, avatar)
      `)
      .single();

    if (messageError || !message) {
      console.error('Error creating message:', messageError);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
      });
      return;
    }

    await supabase.from('notifications').insert({
      user_id: receiverIdBooking,
      type: 'message_received',
      title: 'New Message',
      message: `You have a new message about your booking`,
      data: { booking_id: bookingId, message_id: message.id },
      is_read: false,
    } as any);

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message,
    });
  }
};

// @desc    Get all conversations for the current user
// @route   GET /api/messages
// @access  Private
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    // Get all bookings where user is renter or host
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, renter_id, host_id, status')
      .or(`renter_id.eq.${userId},host_id.eq.${userId}`)
      .in('status', ['confirmed', 'completed']);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations',
      });
      return;
    }

    const bookingIds = (bookings || []).map((b: any) => b.id);

    if (bookingIds.length === 0) {
      res.json({
        success: true,
        data: {
          conversations: [],
        },
      });
      return;
    }

    // Get latest message for each booking
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        booking:bookings!inner(
          id,
          property:properties(id, title, address),
          renter:users!bookings_renter_id_fkey(id, first_name, last_name, avatar),
          host:users!bookings_host_id_fkey(id, first_name, last_name, avatar)
        ),
        sender:users!messages_sender_id_fkey(id, first_name, last_name, avatar),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, avatar)
      `)
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations',
      });
      return;
    }

    // Group by booking and get latest message for each
    const conversationsMap = new Map();
    (messages || []).forEach((msg: any) => {
      const bookingId = msg.booking_id || msg.bookingId;
      if (!conversationsMap.has(bookingId)) {
        conversationsMap.set(bookingId, {
          bookingId,
          booking: msg.booking,
          latestMessage: msg,
          unreadCount: 0,
        });
      }
      const conversation = conversationsMap.get(bookingId);
      const receiverId = msg.receiver_id || msg.receiverId;
      const isRead = msg.is_read || msg.isRead;
      if (receiverId === userId && !isRead) {
        conversation.unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    res.json({
      success: true,
      data: {
        conversations,
      },
    });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
      message: error.message,
    });
  }
};

// @desc    Get conversation for a specific booking (alias for getBookingMessages)
// @route   GET /api/messages/conversation/:bookingId
// @access  Private
export const getConversation = async (req: Request, res: Response): Promise<void> => {
  // Reuse getBookingMessages logic
  req.params.bookingId = req.params.id;
  await getBookingMessages(req, res);
};

// @desc    Get direct message thread between admin and a user (admin only)
// @route   GET /api/messages/direct/:userId
// @access  Private (Admin only)
export const getDirectMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id;
    const { userId: targetUserId } = req.params;
    const supabase = getSupabaseClient();

    if (!targetUserId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    // Fetch messages in both directions where booking_id is null
    const { data: messages1, error: e1 } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, email, avatar),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, email, avatar)
      `)
      .is('booking_id', null)
      .eq('sender_id', adminId)
      .eq('receiver_id', targetUserId)
      .order('created_at', { ascending: true });

    const { data: messages2, error: e2 } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, email, avatar),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, email, avatar)
      `)
      .is('booking_id', null)
      .eq('sender_id', targetUserId)
      .eq('receiver_id', adminId)
      .order('created_at', { ascending: true });

    if (e1 || e2) {
      console.error('Error fetching direct messages:', e1 || e2);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages',
      });
      return;
    }

    const combined = [...(messages1 || []), ...(messages2 || [])].sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let otherUser = combined[0]
      ? (combined[0].sender_id === adminId ? combined[0].receiver : combined[0].sender)
      : null;
    if (!otherUser && targetUserId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar')
        .eq('id', targetUserId)
        .single();
      otherUser = userRow || null;
    }

    res.json({
      success: true,
      data: {
        messages: combined,
        otherUser,
      },
    });
  } catch (error: any) {
    console.error('Error getting direct messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
      message: error.message,
    });
  }
};

