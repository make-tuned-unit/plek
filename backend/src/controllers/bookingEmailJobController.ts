/**
 * Cron job controller: send transactional emails for upcoming bookings and review requests.
 * Call GET or POST /api/cron/booking-emails with header Authorization: Bearer <CRON_SECRET>
 * (or query ?secret=CRON_SECRET). Run hourly via Railway Cron, GitHub Actions, or cron-job.org.
 */

import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import {
  sendRenterUpcomingBookingReminder,
  sendHostUpcomingBookingReminder,
  sendRenterReviewRequestEmail,
  sendHostReviewRequestEmail,
  sendBookingAutoCancelledEmail,
} from '../services/emailService';
import type { BookingEmailData } from '../services/emailService';
import { logger } from '../utils/logger';

const CRON_SECRET = process.env['CRON_SECRET'];

function isAuthorized(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === CRON_SECRET) return true;
  const secret = req.query?.secret;
  return secret === CRON_SECRET;
}

function buildEmailData(booking: any): BookingEmailData {
  const renter = booking.renter || {};
  const host = booking.host || {};
  const property = booking.property || {};
  const vehicleInfo = booking.vehicle_info;
  const vehicleInfoString =
    typeof vehicleInfo === 'object' && vehicleInfo !== null
      ? [vehicleInfo.make, vehicleInfo.model, vehicleInfo.color, vehicleInfo.license_plate]
          .filter(Boolean)
          .join(' ')
      : undefined;
  return {
    bookingId: booking.id,
    renterName: `${renter.first_name || ''} ${renter.last_name || ''}`.trim() || 'Renter',
    renterEmail: renter.email || '',
    hostName: `${host.first_name || ''} ${host.last_name || ''}`.trim() || 'Host',
    hostEmail: host.email || '',
    propertyTitle: property.title || 'Parking space',
    propertyAddress: property.address || '',
    startTime: booking.start_time,
    endTime: booking.end_time,
    totalHours: Number(booking.total_hours) || 0,
    baseAmount: Number(booking.total_amount) || 0,
    totalAmount: Number(booking.total_amount) || 0,
    serviceFee: Number(booking.service_fee) || 0,
    bookerServiceFee: Number(booking.service_fee) || 0,
    hostServiceFee: 0,
    securityDeposit: Number(booking.security_deposit) || 0,
    ...(vehicleInfoString && { vehicleInfo: vehicleInfoString }),
    ...(booking.special_requests && { specialRequests: booking.special_requests }),
    ...(booking.timezone && { timezone: booking.timezone }),
  };
}

/**
 * GET/POST /api/cron/booking-emails
 * Sends:
 * - Renter reminder: upcoming reservation (start_time in next 24h)
 * - Host reminder: upcoming booking (start_time in next 24h)
 * - Renter review request: booking ended 24h+ ago
 * - Host review request: booking ended 24h+ ago
 */
export async function runBookingEmailJob(_req: Request, res: Response): Promise<void> {
  if (!isAuthorized(_req)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const supabase = getSupabaseClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const results = { remindersSent: 0, reviewRequestsSent: 0, autoCancelled: 0, errors: [] as string[] };

  try {
    // ---- Upcoming reminders: start_time between now and now+24h, status confirmed ----
    const { data: upcomingBookings, error: upcomingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        start_time,
        end_time,
        total_hours,
        total_amount,
        service_fee,
        security_deposit,
        special_requests,
        vehicle_info,
        timezone,
        reminder_renter_sent_at,
        reminder_host_sent_at,
        property:properties(id, title, address),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email)
      `
      )
      .eq('status', 'confirmed')
      .gte('start_time', now.toISOString())
      .lte('start_time', in24h.toISOString());

    if (upcomingError) {
      logger.error('[Cron] Failed to fetch upcoming bookings', upcomingError);
      results.errors.push(upcomingError.message);
    } else {
      for (const b of upcomingBookings || []) {
        const data = buildEmailData(b);
        if (!b.reminder_renter_sent_at && data.renterEmail) {
          try {
            await sendRenterUpcomingBookingReminder(data);
            await supabase.from('bookings').update({ reminder_renter_sent_at: new Date().toISOString() }).eq('id', b.id);
            results.remindersSent += 1;
          } catch (e: any) {
            results.errors.push(`Renter reminder ${b.id}: ${e?.message || e}`);
          }
        }
        if (!b.reminder_host_sent_at && data.hostEmail) {
          try {
            await sendHostUpcomingBookingReminder(data);
            await supabase.from('bookings').update({ reminder_host_sent_at: new Date().toISOString() }).eq('id', b.id);
            results.remindersSent += 1;
          } catch (e: any) {
            results.errors.push(`Host reminder ${b.id}: ${e?.message || e}`);
          }
        }
      }
    }

    // ---- Review requests: end_time before (now - 24h), status confirmed or completed ----
    const { data: endedBookings, error: endedError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        start_time,
        end_time,
        total_hours,
        total_amount,
        service_fee,
        security_deposit,
        special_requests,
        vehicle_info,
        timezone,
        review_request_renter_sent_at,
        review_request_host_sent_at,
        property:properties(id, title, address),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email)
      `
      )
      .in('status', ['confirmed', 'completed'])
      .lt('end_time', past24h.toISOString());

    if (endedError) {
      logger.error('[Cron] Failed to fetch ended bookings', endedError);
      results.errors.push(endedError.message);
    } else {
      for (const b of endedBookings || []) {
        const data = buildEmailData(b);
        if (!b.review_request_renter_sent_at && data.renterEmail) {
          try {
            await sendRenterReviewRequestEmail(data);
            await supabase
              .from('bookings')
              .update({ review_request_renter_sent_at: new Date().toISOString() })
              .eq('id', b.id);
            results.reviewRequestsSent += 1;
          } catch (e: any) {
            results.errors.push(`Renter review ${b.id}: ${e?.message || e}`);
          }
        }
        if (!b.review_request_host_sent_at && data.hostEmail) {
          try {
            await sendHostReviewRequestEmail(data);
            await supabase
              .from('bookings')
              .update({ review_request_host_sent_at: new Date().toISOString() })
              .eq('id', b.id);
            results.reviewRequestsSent += 1;
          } catch (e: any) {
            results.errors.push(`Host review ${b.id}: ${e?.message || e}`);
          }
        }
      }
    }

    // ---- Auto-cancel unconfirmed pending bookings within 4h of start ----
    const { data: pendingBookings, error: pendingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        start_time,
        end_time,
        total_hours,
        total_amount,
        service_fee,
        security_deposit,
        special_requests,
        vehicle_info,
        timezone,
        payment_status,
        renter_id,
        host_id,
        property:properties(id, title, address),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email)
      `
      )
      .eq('status', 'pending')
      .lte('start_time', in4h.toISOString());

    if (pendingError) {
      logger.error('[Cron] Failed to fetch pending bookings for auto-cancel', pendingError);
      results.errors.push(pendingError.message);
    } else {
      for (const b of pendingBookings || []) {
        try {
          // Cancel the booking
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id);

          // Refund if payment was completed
          let refundMessage: string | undefined;
          if (b.payment_status === 'completed') {
            try {
              const { data: paymentRecord } = await supabase
                .from('payments')
                .select('*')
                .eq('booking_id', b.id)
                .eq('status', 'completed')
                .single();
              if (paymentRecord?.stripe_payment_id) {
                const Stripe = await import('stripe').then(m => m.default);
                const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
                if (stripeSecretKey) {
                  const stripeInstance = new Stripe(stripeSecretKey.replace(/^["']|["']$/g, ''), { apiVersion: '2023-10-16' });
                  const refund = await stripeInstance.refunds.create({
                    payment_intent: paymentRecord.stripe_payment_id,
                    reason: 'requested_by_customer',
                  });
                  await supabase.from('payments').update({ status: 'refunded', stripe_refund_id: refund.id }).eq('id', paymentRecord.id);
                  await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', b.id);
                  refundMessage = 'A full refund has been issued to your original payment method.';
                  logger.info(`[Cron] Auto-cancel refund for booking ${b.id}: ${refund.id}`);
                }
              }
            } catch (refundErr: any) {
              logger.error(`[Cron] Failed to refund auto-cancelled booking ${b.id}`, refundErr);
              results.errors.push(`Refund ${b.id}: ${refundErr?.message || refundErr}`);
            }
          }

          const renter = b.renter || {} as any;
          const host = b.host || {} as any;
          const property = b.property || {} as any;
          const renterName = `${renter.first_name || ''} ${renter.last_name || ''}`.trim() || 'Renter';
          const hostName = `${host.first_name || ''} ${host.last_name || ''}`.trim() || 'Host';
          const propertyTitle = property.title || 'Parking space';
          const propertyAddress = property.address || '';

          // Send emails to both parties
          const emailBase = {
            propertyTitle,
            propertyAddress,
            bookingId: b.id,
            startTime: b.start_time,
            endTime: b.end_time,
            timezone: b.timezone || undefined,
          };
          if (renter.email) {
            await sendBookingAutoCancelledEmail({ ...emailBase, recipientName: renterName, recipientEmail: renter.email, recipientIsHost: false, refundMessage });
          }
          if (host.email) {
            await sendBookingAutoCancelledEmail({ ...emailBase, recipientName: hostName, recipientEmail: host.email, recipientIsHost: true });
          }

          // Create notifications
          await supabase.from('notifications').insert([
            {
              user_id: b.renter_id,
              type: 'booking_cancelled',
              title: 'Booking auto-cancelled',
              message: `Your booking request for ${propertyTitle} was auto-cancelled because the host didn't confirm in time.${refundMessage ? ' ' + refundMessage : ''}`,
              data: { booking_id: b.id, property_id: property.id },
              is_read: false,
            },
            {
              user_id: b.host_id,
              type: 'booking_cancelled',
              title: 'Booking auto-cancelled',
              message: `A booking request for ${propertyTitle} was auto-cancelled because it was not confirmed at least 4 hours before the start time.`,
              data: { booking_id: b.id, property_id: property.id },
              is_read: false,
            },
          ] as any);

          results.autoCancelled += 1;
        } catch (e: any) {
          results.errors.push(`Auto-cancel ${b.id}: ${e?.message || e}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking email job completed',
      ...results,
    });
  } catch (err: any) {
    logger.error('[Cron] Booking email job failed', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Job failed',
      ...results,
    });
  }
}
