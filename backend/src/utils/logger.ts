/**
 * Production-safe logger. In production:
 * - No debug/info logs (or info only with redacted message).
 * - Error logs: message only, no stack traces or full objects that might contain secrets/PII.
 * - Redacts: emails, tokens, API keys, Bearer tokens, long hex/JWT-like strings.
 */

const isProd = process.env['NODE_ENV'] === 'production';

/** Redact known secret and PII patterns from a string or object. */
function redact(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Email: keep first 2 chars and domain, mask middle
  s = s.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/gi, (m) => {
    const [local, domain] = m.split('@');
    const keep = local.length <= 2 ? local : local.slice(0, 2);
    return `${keep}***@${domain}`;
  });
  // Bearer tokens
  s = s.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
  // JWT / long base64-like (alphanumeric 50+)
  s = s.replace(/\b[A-Za-z0-9_-]{50,}\b/g, '[REDACTED]');
  // sk_/pk_/whsec_ Stripe keys
  s = s.replace(/\b(sk_|pk_|whsec_|re_)[^\s"']+/gi, '$1[REDACTED]');
  // Generic "key": "value" where value looks secret
  s = s.replace(/"(\w*key|\w*token|\w*secret|password)":\s*"[^"]*"/gi, '"$1": "[REDACTED]"');
  return s;
}

/** Log only in development; in production no-op (avoids leaking PII/secrets). */
export function debug(msg: string, meta?: unknown): void {
  if (!isProd) {
    const m = meta !== undefined ? ` ${redact(meta)}` : '';
    console.log(redact(msg) + m);
  }
}

/** Info: dev only. In prod we skip to avoid accidental PII. */
export function info(msg: string, meta?: unknown): void {
  if (!isProd) {
    const m = meta !== undefined ? ` ${redact(meta)}` : '';
    console.log(redact(msg) + m);
  }
}

/** Warn: dev full message; prod redacted message only. */
export function warn(msg: string, meta?: unknown): void {
  if (meta !== undefined) {
    console.warn(redact(msg), isProd ? redact(meta) : meta);
  } else {
    console.warn(redact(msg));
  }
}

/** Error: always log, but in prod only redacted message and err.message (no stack, no full object). */
export function error(msg: string, err?: unknown): void {
  if (isProd) {
    const errMsg = err instanceof Error ? err.message : err != null ? String(err) : '';
    console.error(redact(msg), errMsg ? redact(errMsg) : '');
  } else {
    if (err !== undefined) console.error(redact(msg), err);
    else console.error(redact(msg));
  }
}

export const logger = { debug, info, warn, error, redact };
