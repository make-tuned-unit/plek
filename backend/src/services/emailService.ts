import { Resend } from 'resend';

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
function getFromEmail(): string {
  return process.env['FROM_EMAIL'] || 'onboarding@resend.dev';
}

// Get the frontend URL for links
function getFrontendUrl(): string {
  return process.env['FRONTEND_URL'] || 'http://localhost:3000';
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
 * Send welcome email to new user
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to plekk!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${firstName},</p>
              <p>Thank you for joining plekk! We're excited to have you on board.</p>
              <p>You can now:</p>
              <ul>
                <li>Find secure parking spaces near you</li>
                <li>List your driveway and earn money</li>
                <li>Book parking by the hour</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl()}/find-parking" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Find Parking</a>
              </div>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy parking!</p>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The plekk Team</p>
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Booking Confirmed!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${data.renterName},</p>
              <p>Your parking booking has been confirmed!</p>
              
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h2 style="margin-top: 0; color: #667eea;">${data.propertyTitle}</h2>
                <p style="margin: 5px 0;"><strong>Address:</strong> ${data.propertyAddress}</p>
                <p style="margin: 5px 0;"><strong>Start:</strong> ${startDate}</p>
                <p style="margin: 5px 0;"><strong>End:</strong> ${endDate}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> ${data.totalHours} hour${data.totalHours !== 1 ? 's' : ''}</p>
                ${data.vehicleInfo ? `<p style="margin: 5px 0;"><strong>Vehicle:</strong> ${data.vehicleInfo}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Payment Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;">Parking Fee:</td>
                    <td style="text-align: right; padding: 8px 0;">$${data.baseAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">plekk Service Fee (5%):</td>
                    <td style="text-align: right; padding: 8px 0;">$${data.serviceFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">Security Deposit:</td>
                    <td style="text-align: right; padding: 8px 0;">$${data.securityDeposit.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #333; font-weight: bold;">
                    <td style="padding: 8px 0;">Total Charged:</td>
                    <td style="text-align: right; padding: 8px 0;">$${(data.baseAmount + data.serviceFee + data.securityDeposit).toFixed(2)}</td>
                  </tr>
                </table>
                <p style="margin-top: 12px; color: #666; font-size: 12px;">
                  Note: Hosts pay a separate 5% plekk service fee from their payout.
                </p>
              </div>
              
              ${data.specialRequests ? `
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Special Requests:</strong> ${data.specialRequests}</p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl()}/profile" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Booking</a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The plekk Team</p>
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
      subject: `New Booking: ${data.propertyTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">New Booking Request</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${data.hostName},</p>
              <p>You have a new booking request for your parking space!</p>
              
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h2 style="margin-top: 0; color: #667eea;">${data.propertyTitle}</h2>
                <p style="margin: 5px 0;"><strong>Renter:</strong> ${data.renterName}</p>
                <p style="margin: 5px 0;"><strong>Start:</strong> ${startDate}</p>
                <p style="margin: 5px 0;"><strong>End:</strong> ${endDate}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> ${data.totalHours} hour${data.totalHours !== 1 ? 's' : ''}</p>
                ${data.vehicleInfo ? `<p style="margin: 5px 0;"><strong>Vehicle:</strong> ${data.vehicleInfo}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Estimated Payout</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;">Booking Subtotal:</td>
                    <td style="text-align: right; padding: 8px 0;">$${data.baseAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">plekk Host Fee (5%):</td>
                    <td style="text-align: right; padding: 8px 0;">-$${data.hostServiceFee.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #333; font-weight: bold;">
                    <td style="padding: 8px 0;">Estimated Payout:</td>
                    <td style="text-align: right; padding: 8px 0;">$${(data.baseAmount - data.hostServiceFee).toFixed(2)}</td>
                  </tr>
                </table>
                <p style="color: #666; font-size: 14px; margin-top: 12px;">Any security deposit or adjustments will be handled separately.</p>
              </div>
              
              ${data.specialRequests ? `
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Special Requests:</strong> ${data.specialRequests}</p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl()}/profile" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Manage Booking</a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The plekk Team</p>
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Payment Receipt</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${data.userName},</p>
              <p>Thank you for your payment! Here's your receipt:</p>
              
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h2 style="margin-top: 0; color: #667eea;">${data.propertyTitle}</h2>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${paymentDate}</p>
                <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${data.transactionId}</p>
                <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${data.bookingId}</p>
              </div>
              
              <p>This receipt confirms your payment has been processed successfully.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl()}/profile" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Booking</a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The plekk Team</p>
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Password Reset</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${firstName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              </div>
              
              <p>If you didn't request this, you can safely ignore this email. Your password will not be changed.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The plekk Team</p>
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

