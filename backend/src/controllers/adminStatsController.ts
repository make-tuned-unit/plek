import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// Helper function to parse date range
function parseDateRange(startDate?: string, endDate?: string): { start: Date | null; end: Date | null } {
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  }

  if (endDate) {
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

// @desc    Get admin dashboard KPIs
// @route   GET /api/admin/stats
// @access  Private (Admin only)
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    const { startDate, endDate, bookingStatus } = req.query;
    // bookingStatus: 'all' = non-cancelled count; 'paid' = confirmed+completed only
    const countPaidBookingsOnly = bookingStatus === 'paid';

    // Verify user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    // 1. Total Bookings (all non-cancelled, or only confirmed+completed if bookingStatus=paid)
    let bookingsCount = 0;
    const bookingStatusFilter = countPaidBookingsOnly ? ['confirmed', 'completed'] : null;
    if (start || end) {
      let query = supabase.from('bookings').select('id', { count: 'exact', head: true });
      if (bookingStatusFilter) query = query.in('status', bookingStatusFilter);
      else query = query.neq('status', 'cancelled');
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lte('created_at', end.toISOString());
      const { count } = await query;
      bookingsCount = count || 0;
    } else {
      let query = supabase.from('bookings').select('id', { count: 'exact', head: true });
      if (bookingStatusFilter) query = query.in('status', bookingStatusFilter);
      else query = query.neq('status', 'cancelled');
      const { count } = await query;
      bookingsCount = count || 0;
    }

    // 2. Total Users
    let usersCount = 0;
    if (start || end) {
      let query = supabase.from('users').select('id', { count: 'exact', head: true });
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lte('created_at', end.toISOString());
      const { count } = await query;
      usersCount = count || 0;
    } else {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
      usersCount = count || 0;
    }

    // 3. Total Listings (Properties)
    let listingsCount = 0;
    if (start || end) {
      let query = supabase.from('properties').select('id', { count: 'exact', head: true }).neq('status', 'deleted');
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lte('created_at', end.toISOString());
      const { count } = await query;
      listingsCount = count || 0;
    } else {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'deleted');
      listingsCount = count || 0;
    }

    // 4. Total Value of Bookings (sum of total_amount for completed/confirmed bookings)
    let totalBookingValue = 0;
    if (start || end) {
      let query = supabase
        .from('bookings')
        .select('total_amount')
        .in('status', ['confirmed', 'completed'])
        .neq('status', 'cancelled');
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lte('created_at', end.toISOString());
      const { data: bookings } = await query;
      totalBookingValue = (bookings || []).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
    } else {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount')
        .in('status', ['confirmed', 'completed'])
        .neq('status', 'cancelled');
      totalBookingValue = (bookings || []).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
    }

    // 5. Total Service Fee Revenue
    // Service fee is stored in bookings table as service_fee (booker's fee)
    // We also need to calculate host service fees from payments
    let totalServiceFeeRevenue = 0;

    // Get booker service fees from bookings
    if (start || end) {
      let query = supabase
        .from('bookings')
        .select('service_fee')
        .in('status', ['confirmed', 'completed'])
        .neq('status', 'cancelled');
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lte('created_at', end.toISOString());
      const { data: bookings } = await query;
      const bookerFees = (bookings || []).reduce((sum: number, b: any) => sum + (b.service_fee || 0), 0);
      totalServiceFeeRevenue += bookerFees;
    } else {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('service_fee')
        .in('status', ['confirmed', 'completed'])
        .neq('status', 'cancelled');
      const bookerFees = (bookings || []).reduce((sum: number, b: any) => sum + (b.service_fee || 0), 0);
      totalServiceFeeRevenue += bookerFees;
    }

    // Host service fees are typically 5% of the booking amount (excluding booker fee)
    // Calculate from booking amounts: host_fee = (total_amount - service_fee) * 0.05
    if (start || end) {
      let query = supabase
        .from('bookings')
        .select('total_amount, service_fee')
        .in('status', ['confirmed', 'completed'])
        .neq('status', 'cancelled');
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lte('created_at', end.toISOString());
      const { data: bookings } = await query;
      const hostFees = (bookings || []).reduce((sum: number, b: any) => {
        const hostAmount = (b.total_amount || 0) - (b.service_fee || 0);
        return sum + hostAmount * 0.05; // 5% host fee
      }, 0);
      totalServiceFeeRevenue += hostFees;
    } else {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount, service_fee')
        .in('status', ['confirmed', 'completed'])
        .neq('status', 'cancelled');
      const hostFees = (bookings || []).reduce((sum: number, b: any) => {
        const hostAmount = (b.total_amount || 0) - (b.service_fee || 0);
        return sum + hostAmount * 0.05; // 5% host fee
      }, 0);
      totalServiceFeeRevenue += hostFees;
    }

    res.json({
      success: true,
      data: {
        bookings: bookingsCount,
        users: usersCount,
        listings: listingsCount,
        totalRevenue: Math.round(totalBookingValue * 100) / 100,
        totalFees: Math.round(totalServiceFeeRevenue * 100) / 100,
        totalBookingValue: Math.round(totalBookingValue * 100) / 100,
        totalServiceFeeRevenue: Math.round(totalServiceFeeRevenue * 100) / 100,
        dateRange: {
          start: start?.toISOString() || null,
          end: end?.toISOString() || null,
        },
        filters: { bookingStatus: countPaidBookingsOnly ? 'paid' : 'all' },
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics',
      message: error.message,
    });
  }
};

