import { Request, Response } from 'express';
import { sendContactFormEmail } from '../services/emailService';

const INBOUND_FORWARD_TO = process.env['INBOUND_FORWARD_TO'] || 'jesse.sharratt@gmail.com';

/**
 * POST /api/contact - Submit contact form. Sends an email to INBOUND_FORWARD_TO with reply-to set to submitter.
 */
export async function submitContact(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, topic, message } = req.body;
    if (!name || !email || typeof name !== 'string' || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'Name and email are required' });
      return;
    }
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedName || !trimmedEmail) {
      res.status(400).json({ success: false, message: 'Name and email are required' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      return;
    }
    await sendContactFormEmail(
      INBOUND_FORWARD_TO,
      trimmedName,
      trimmedEmail,
      trimmedTopic,
      trimmedMessage
    );
    res.status(200).json({ success: true, message: 'Thanks! We\'ll get back to you soon.' });
  } catch (err: any) {
    console.error('[Contact] Error sending contact form email:', err);
    res.status(500).json({ success: false, message: err?.message || 'Something went wrong. Please try again or email us directly.' });
  }
}
