import { Resend } from 'resend';

/**
 * All plekk transactional emails are sent through Resend
 * This ensures consistent branding, messaging control, and deliverability
 * Supabase is only used for authentication - NOT for sending emails
 */

// Initialize Resend client
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env['RESEND_API_KEY'];
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// Get the from email address
// Note: For Resend test mode, you can only send to your verified email address
// To send to any email, verify a domain at resend.com/domains and use that domain
function getFromEmail(): string {
  // Check if FROM_EMAIL is set, otherwise use a default
  // IMPORTANT: If using onboarding@resend.dev, you can only send to your verified email
  // For production, verify a domain and use: noreply@yourdomain.com
  return process.env['FROM_EMAIL'] || 'onboarding@resend.dev';
}

// Get the frontend URL for links (confirm email, reset password, etc.). In production, set FRONTEND_URL to your public app URL.
function getFrontendUrl(): string {
  return process.env['FRONTEND_URL'] || 'http://localhost:3000';
}

// Brand colors
const BRAND_COLORS = {
  accent: '#3dbb85', // accent-500
  accentDark: '#32a572', // accent-600
  primary: '#242f3f', // primary-900
  primaryLight: '#2e4057', // primary-800
  text: '#333333',
  textLight: '#666666',
  background: '#f9f9f9',
  white: '#ffffff',
};

// Generate email header with logo
function getEmailHeader(title: string): string {
  const logoUrl = `${getFrontendUrl()}/logo.png`;
  return `
    <div style="background: ${BRAND_COLORS.white}; padding: 30px 20px; border-bottom: 3px solid ${BRAND_COLORS.accent};">
      <img src="${logoUrl}" alt="plekk logo" style="max-width: 100px; height: auto; margin-bottom: 20px;" />
      <h1 style="color: ${BRAND_COLORS.primary}; margin: 0; font-size: 28px; font-weight: 600; text-align: left;">${title}</h1>
    </div>
  `;
}

// Generate email footer
function getEmailFooter(): string {
  return `
    <div style="background: ${BRAND_COLORS.background}; padding: 30px 20px; border-top: 1px solid #e5e5e5; margin-top: 30px;">
      <p style="margin: 0 0 10px 0; color: ${BRAND_COLORS.textLight}; font-size: 14px; text-align: center;">
        <strong style="color: ${BRAND_COLORS.text};">plekk</strong> — parking marketplace powered by local driveways
      </p>
      <p style="margin: 10px 0 0 0; color: ${BRAND_COLORS.textLight}; font-size: 12px; text-align: center;">
        Halifax, Nova Scotia, Canada
      </p>
      <p style="margin: 20px 0 0 0; color: ${BRAND_COLORS.textLight}; font-size: 12px; text-align: center;">
        <a href="${getFrontendUrl()}" style="color: ${BRAND_COLORS.accent}; text-decoration: none;">Visit plekk</a> | 
        <a href="${getFrontendUrl()}/contact" style="color: ${BRAND_COLORS.accent}; text-decoration: none;">Contact Support</a>
      </p>
    </div>
  `;
}

export interface BookingEmailData {
  bookingId: string;
  renterName: string;
  renterEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyAddress: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  baseAmount: number;
  totalAmount: number;
  serviceFee: number; // Booker-facing fee
  bookerServiceFee: number;
  hostServiceFee: number;
  securityDeposit: number;
  vehicleInfo?: string | undefined;
  specialRequests?: string | undefined;
}

export interface PaymentEmailData {
  bookingId: string;
  userName: string;
  userEmail: string;
  propertyTitle: string;
  amount: number;
  paymentDate: string;
  transactionId: string;
}

/**
 * Send email confirmation email to new user
 */
export async function sendEmailConfirmationEmail(
  email: string,
  firstName: string,
  confirmationLink: string
): Promise<void> {
  try {
    const client = getResendClient();
    const fromEmail = getFromEmail();
    
    console.log(`[Email] Attempting to send confirmation email to ${email} from ${fromEmail}`);
    
    // Check if we're using test mode (onboarding@resend.dev) and warn if sending to non-verified email
    if (fromEmail === 'onboarding@resend.dev' || fromEmail.includes('@resend.dev')) {
      console.warn(`[Email] ⚠️ Using Resend test mode. Emails can only be sent to your verified email address.`);
      console.warn(`[Email] To send to any email, verify a domain at resend.com/domains and update FROM_EMAIL env variable.`);
    }
    
    const result = await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Confirm your plekk account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${BRAND_COLORS.background};">
            <div style="background: ${BRAND_COLORS.white}; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${getEmailHeader('Confirm Your Account')}
              <div style="background: ${BRAND_COLORS.white}; padding: 40px 30px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName},</p>
                <p style="font-size: 16px; margin: 0 0 30px 0;">Thank you for signing up for plekk! Please confirm your email address to activate your account.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmationLink}" style="background: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Confirm Email Address</a>
                </div>
                
                <p style="font-size: 14px; margin: 30px 0 0 0; color: ${BRAND_COLORS.textLight};">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; margin: 10px 0 0 0; color: ${BRAND_COLORS.accent}; word-break: break-all;">${confirmationLink}</p>
                
                <p style="color: ${BRAND_COLORS.textLight}; font-size: 13px; margin-top: 30px; padding: 15px; background: ${BRAND_COLORS.background}; border-radius: 8px;">⚠️ This confirmation link will expire in 24 hours.</p>
                
                <p style="font-size: 16px; margin: 30px 0 0 0;">If you didn't create an account with plekk, you can safely ignore this email.</p>
                <p style="margin-top: 30px; color: ${BRAND_COLORS.textLight}; font-size: 14px;">Best regards,<br><strong>The plekk Team</strong></p>
              </div>
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `,
    });
    
    // Check for errors in the response
    if (result.error) {
      console.error('[Email] ❌ Resend API error:', JSON.stringify(result.error, null, 2));
      
      // Provide helpful error message for common Resend validation errors
      if (result.error.message?.includes('testing emails to your own email address')) {
        const helpfulError = `Resend validation error: ${result.error.message}\n\n` +
          `SOLUTION: You're using Resend test mode (onboarding@resend.dev). ` +
          `You can only send emails to your verified email address (jesse.sharratt@gmail.com). ` +
          `To send to any email:\n` +
          `1. Verify a domain at https://resend.com/domains\n` +
          `2. Set FROM_EMAIL env variable to use your verified domain (e.g., noreply@yourdomain.com)`;
        console.error(`[Email] ${helpfulError}`);
        throw new Error(helpfulError);
      }
      
      throw new Error(`Resend API error: ${result.error.message || 'Unknown error'}`);
    }
    
    // Log success with Resend email ID
    if (result.data?.id) {
      console.log(`[Email] ✅ Confirmation email sent successfully to ${email}. Resend Email ID: ${result.data.id}`);
    } else {
      console.warn(`[Email] ⚠️ Email sent but no Resend ID returned. Response:`, JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    console.error('[Email] Error sending confirmation email:', error);
    console.error('[Email] Error details:', JSON.stringify(error, null, 2));
    throw error; // Re-throw so registration can handle it
  }
}

/**
 * Send welcome email to new user (after confirmation)
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<void> {
  try {
    const client = getResendClient();
    
    await client.emails.send({
      from: getFromEmail(),
      to: email,
      subject: 'Welcome to plekk!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${BRAND_COLORS.background};">
            <div style="background: ${BRAND_COLORS.white}; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${getEmailHeader('Welcome to plekk!')}
              <div style="background: ${BRAND_COLORS.white}; padding: 40px 30px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName},</p>
                <p style="font-size: 16px; margin: 0 0 20px 0;">Thank you for joining plekk! We're excited to have you on board.</p>
                <p style="font-size: 16px; margin: 0 0 15px 0;">You can now:</p>
                <ul style="margin: 0 0 30px 0; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">Find secure parking spaces near you</li>
                  <li style="margin-bottom: 10px;">List your driveway and earn money</li>
                  <li style="margin-bottom: 10px;">Book parking by the hour</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${getFrontendUrl()}/find-parking" style="background: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Find Parking</a>
                </div>
                <p style="font-size: 16px; margin: 30px 0 0 0;">If you have any questions, feel free to reach out to our support team.</p>
                <p style="font-size: 16px; margin: 20px 0 0 0;">Happy parking!</p>
                <p style="margin-top: 30px; color: ${BRAND_COLORS.textLight}; font-size: 14px;">Best regards,<br><strong>The plekk Team</strong></p>
              </div>
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `,
    });
    
    console.log(`[Email] Welcome email sent to ${email}`);
  } catch (error: any) {
    console.error('[Email] Error sending welcome email:', error);
    // Don't throw - email failures shouldn't break the registration flow
  }
}

/**
 * Send booking confirmation email to renter
 */
export async function sendBookingConfirmationEmail(
  data: BookingEmailData
): Promise<void> {
  try {
    const client = getResendClient();
    
    const startDate = new Date(data.startTime).toLocaleString();
    const endDate = new Date(data.endTime).toLocaleString();
    
    await client.emails.send({
      from: getFromEmail(),
      to: data.renterEmail,
      subject: `Booking Confirmed: ${data.propertyTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${BRAND_COLORS.background};">
            <div style="background: ${BRAND_COLORS.white}; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${getEmailHeader('Booking Confirmed!')}
              <div style="background: ${BRAND_COLORS.white}; padding: 40px 30px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${data.renterName},</p>
                <p style="font-size: 16px; margin: 0 0 30px 0;">Your parking booking has been confirmed!</p>
                
                <div style="background: ${BRAND_COLORS.background}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.accent};">
                  <h2 style="margin-top: 0; color: ${BRAND_COLORS.accent}; font-size: 20px; font-weight: 600;">${data.propertyTitle}</h2>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Address:</strong> ${data.propertyAddress}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Start:</strong> ${startDate}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>End:</strong> ${endDate}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Duration:</strong> ${data.totalHours} hour${data.totalHours !== 1 ? 's' : ''}</p>
                  ${data.vehicleInfo ? `<p style="margin: 8px 0; font-size: 15px;"><strong>Vehicle:</strong> ${data.vehicleInfo}</p>` : ''}
                </div>
                
                <div style="background: ${BRAND_COLORS.background}; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: ${BRAND_COLORS.text}; font-size: 18px; font-weight: 600;">Payment Summary</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; font-size: 15px;">Parking Fee:</td>
                      <td style="text-align: right; padding: 10px 0; font-size: 15px;">$${data.baseAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-size: 15px;">plekk Service Fee (5%):</td>
                      <td style="text-align: right; padding: 10px 0; font-size: 15px;">$${data.serviceFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-size: 15px;">Security Deposit:</td>
                      <td style="text-align: right; padding: 10px 0; font-size: 15px;">$${data.securityDeposit.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 2px solid ${BRAND_COLORS.text}; font-weight: bold;">
                      <td style="padding: 12px 0; font-size: 16px;">Total Charged:</td>
                      <td style="text-align: right; padding: 12px 0; font-size: 16px; color: ${BRAND_COLORS.accent};">$${(data.baseAmount + data.serviceFee + data.securityDeposit).toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
                
                ${data.specialRequests ? `
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 15px;"><strong>Special Requests:</strong> ${data.specialRequests}</p>
                  </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${getFrontendUrl()}/profile" style="background: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">View Booking</a>
                </div>
                
                <p style="margin-top: 30px; color: ${BRAND_COLORS.textLight}; font-size: 14px;">Best regards,<br><strong>The plekk Team</strong></p>
              </div>
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `,
    });
    
    console.log(`[Email] Booking confirmation sent to ${data.renterEmail}`);
  } catch (error: any) {
    console.error('[Email] Error sending booking confirmation:', error);
  }
}

/**
 * Send booking notification email to host
 */
export async function sendBookingNotificationEmail(
  data: BookingEmailData
): Promise<void> {
  try {
    const client = getResendClient();
    
    const startDate = new Date(data.startTime).toLocaleString();
    const endDate = new Date(data.endTime).toLocaleString();
    
    await client.emails.send({
      from: getFromEmail(),
      to: data.hostEmail,
      subject: `Booking Confirmed: ${data.propertyTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${BRAND_COLORS.background};">
            <div style="background: ${BRAND_COLORS.white}; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${getEmailHeader('Your Space Has Been Booked')}
              <div style="background: ${BRAND_COLORS.white}; padding: 40px 30px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${data.hostName},</p>
                <p style="font-size: 16px; margin: 0 0 30px 0;">Your parking space has been booked! A driver has confirmed their reservation and payment has been processed.</p>
                
                <div style="background: ${BRAND_COLORS.background}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.accent};">
                  <h2 style="margin-top: 0; color: ${BRAND_COLORS.accent}; font-size: 20px; font-weight: 600;">${data.propertyTitle}</h2>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Renter:</strong> ${data.renterName}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Start:</strong> ${startDate}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>End:</strong> ${endDate}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Duration:</strong> ${data.totalHours} hour${data.totalHours !== 1 ? 's' : ''}</p>
                  ${data.vehicleInfo ? `<p style="margin: 8px 0; font-size: 15px;"><strong>Vehicle:</strong> ${data.vehicleInfo}</p>` : ''}
                </div>
                
                ${data.specialRequests ? `
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 15px;"><strong>Special Requests:</strong> ${data.specialRequests}</p>
                  </div>
                ` : ''}
                
                <div style="background: ${BRAND_COLORS.background}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.accent};">
                  <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">
                    <strong>Note:</strong> If you need to cancel this booking, you can do so from your dashboard. The driver will receive a full refund.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${getFrontendUrl()}/profile?tab=bookings&bookingId=${data.bookingId}" style="background: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Manage Booking</a>
                </div>
                
                <p style="margin-top: 30px; color: ${BRAND_COLORS.textLight}; font-size: 14px;">Best regards,<br><strong>The plekk Team</strong></p>
              </div>
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `,
    });
    
    console.log(`[Email] Booking notification sent to ${data.hostEmail}`);
  } catch (error: any) {
    console.error('[Email] Error sending booking notification:', error);
  }
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  data: PaymentEmailData
): Promise<void> {
  try {
    const client = getResendClient();
    
    const paymentDate = new Date(data.paymentDate).toLocaleString();
    
    await client.emails.send({
      from: getFromEmail(),
      to: data.userEmail,
      subject: `Payment Receipt - ${data.propertyTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${BRAND_COLORS.background};">
            <div style="background: ${BRAND_COLORS.white}; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${getEmailHeader('Payment Receipt')}
              <div style="background: ${BRAND_COLORS.white}; padding: 40px 30px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${data.userName},</p>
                <p style="font-size: 16px; margin: 0 0 30px 0;">Thank you for your payment! Here's your receipt:</p>
                
                <div style="background: ${BRAND_COLORS.background}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.accent};">
                  <h2 style="margin-top: 0; color: ${BRAND_COLORS.accent}; font-size: 20px; font-weight: 600;">${data.propertyTitle}</h2>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Amount:</strong> <span style="color: ${BRAND_COLORS.accent}; font-weight: 600;">$${data.amount.toFixed(2)}</span></p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Date:</strong> ${paymentDate}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Transaction ID:</strong> <span style="font-family: monospace; font-size: 14px;">${data.transactionId}</span></p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Booking ID:</strong> <span style="font-family: monospace; font-size: 14px;">${data.bookingId}</span></p>
                </div>
                
                <p style="font-size: 16px; margin: 30px 0;">This receipt confirms your payment has been processed successfully.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${getFrontendUrl()}/profile?tab=bookings&bookingId=${data.bookingId}" style="background: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">View Booking</a>
                </div>
                
                <p style="margin-top: 30px; color: ${BRAND_COLORS.textLight}; font-size: 14px;">Best regards,<br><strong>The plekk Team</strong></p>
              </div>
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `,
    });
    
    console.log(`[Email] Payment receipt sent to ${data.userEmail}`);
  } catch (error: any) {
    console.error('[Email] Error sending payment receipt:', error);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string
): Promise<void> {
  try {
    const client = getResendClient();
    
    const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${resetToken}`;
    
    await client.emails.send({
      from: getFromEmail(),
      to: email,
      subject: 'Reset Your plekk Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${BRAND_COLORS.background};">
            <div style="background: ${BRAND_COLORS.white}; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${getEmailHeader('Password Reset')}
              <div style="background: ${BRAND_COLORS.white}; padding: 40px 30px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName},</p>
                <p style="font-size: 16px; margin: 0 0 30px 0;">We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Reset Password</a>
                </div>
                
                <p style="font-size: 16px; margin: 30px 0;">If you didn't request this, you can safely ignore this email. Your password will not be changed.</p>
                <p style="color: ${BRAND_COLORS.textLight}; font-size: 13px; margin-top: 30px; padding: 15px; background: ${BRAND_COLORS.background}; border-radius: 8px;">⚠️ This link will expire in 1 hour.</p>
                
                <p style="margin-top: 30px; color: ${BRAND_COLORS.textLight}; font-size: 14px;">Best regards,<br><strong>The plekk Team</strong></p>
              </div>
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `,
    });
    
    console.log(`[Email] Password reset email sent to ${email}`);
  } catch (error: any) {
    console.error('[Email] Error sending password reset email:', error);
    throw error; // Re-throw for password reset - this is important
  }
}

