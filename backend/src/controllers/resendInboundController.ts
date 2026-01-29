import { Request, Response } from 'express';
import { Resend } from 'resend';

const resend = new Resend(process.env['RESEND_API_KEY']);

const INBOUND_FORWARD_TO = process.env['INBOUND_FORWARD_TO'] || 'jesse.sharratt@gmail.com';
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'support@parkplekk.com';

/**
 * Resend Inbound webhook: verify signature, fetch received email, forward to INBOUND_FORWARD_TO.
 * Expects raw body (express.raw) and Svix headers for verification.
 */
export async function handleResendInbound(req: Request, res: Response): Promise<void> {
  try {
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : '';
    const id = req.headers['svix-id'] as string;
    const timestamp = req.headers['svix-timestamp'] as string;
    const signature = req.headers['svix-signature'] as string;
    const webhookSecret = process.env['RESEND_WEBHOOK_SECRET'];

    if (!webhookSecret) {
      console.error('[Resend Inbound] RESEND_WEBHOOK_SECRET is not set');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }
    if (!id || !timestamp || !signature) {
      res.status(400).json({ error: 'Missing Svix headers' });
      return;
    }

    let event: { type: string; data: { email_id: string; subject?: string; from?: string; to?: string[] } };
    try {
      event = resend.webhooks.verify({
        payload: rawBody,
        headers: { id, timestamp, signature },
        webhookSecret,
      }) as { type: string; data: { email_id: string; subject?: string; from?: string; to?: string[] } };
    } catch (err) {
      console.error('[Resend Inbound] Webhook verification failed:', err);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    if (event.type !== 'email.received') {
      res.status(200).json({ received: true });
      return;
    }

    const emailId = event.data?.email_id;
    if (!emailId) {
      res.status(200).json({ received: true });
      return;
    }

    const { data: email, error: emailError } = await resend.emails.receiving.get(emailId);
    if (emailError || !email) {
      console.error('[Resend Inbound] Failed to fetch received email:', emailError);
      res.status(200).json({ received: true });
      return;
    }

    let attachments: { filename?: string; content?: string; content_type?: string }[] = [];
    try {
      const { data: attData } = await resend.emails.receiving.attachments.list({
        emailId,
      });
      const list = attData?.data || [];
      for (const att of list) {
        const downloadUrl = (att as any).download_url;
        if (downloadUrl) {
          const response = await fetch(downloadUrl);
          const buffer = Buffer.from(await response.arrayBuffer());
          attachments.push({
            filename: (att as any).filename,
            content: buffer.toString('base64'),
            content_type: (att as any).content_type,
          });
        }
      }
    } catch (attErr) {
      console.warn('[Resend Inbound] Could not fetch attachments:', attErr);
    }

    const emailData = email as { subject?: string; from?: string; html?: string; text?: string };
    const subject = event.data?.subject ?? emailData.subject ?? '(No subject)';
    const fromLabel = event.data?.from ?? emailData.from ?? 'Unknown';
    const toAddresses = Array.isArray(event.data?.to) ? event.data.to.join(', ') : (event.data?.to as string) || '';

    const html =
      (emailData.html || '') +
      `<hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
<p style="font-size:12px;color:#666;">Forwarded from ${toAddresses}. Original from: ${fromLabel}</p>`;
    const text = (emailData.text || '') + `\n\n---\nForwarded from ${toAddresses}. Original from: ${fromLabel}`;

    const { error: sendError } = await resend.emails.send({
      from: `plekk Inbound <${FROM_EMAIL}>`,
      to: [INBOUND_FORWARD_TO],
      subject: `Fwd: ${subject}`,
      html: html || undefined,
      text: text || undefined,
      attachments: attachments.length ? attachments : undefined,
    });

    if (sendError) {
      console.error('[Resend Inbound] Failed to forward email:', sendError);
      res.status(500).json({ error: 'Forward failed' });
      return;
    }

    res.status(200).json({ forwarded: true, to: INBOUND_FORWARD_TO });
  } catch (err: any) {
    console.error('[Resend Inbound] Error:', err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
}
