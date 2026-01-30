# Security

## Reporting vulnerabilities

If you find a security issue, please **do not** open a public issue. Email the maintainers or use your preferred private channel.

## If env or secret files were ever committed

**Backend `.env.bak` / `.env.backup` / `.env.save` were previously tracked and have been removed from the repo.** They may have contained Supabase keys and other secrets. If your clone or CI ever had access to those commits:

1. **Rotate all secrets** that might have been in those files:
   - Supabase: create new anon key and service role key in the dashboard; revoke old ones.
   - Stripe, Resend, JWT, and any other API keys: regenerate and update env vars everywhere.
2. See [docs/SECURITY_GUIDE.md](./docs/SECURITY_GUIDE.md) for a full checklist and optional history cleanup (BFG).

## Dependencies

Run `npm audit` in **backend** and **frontend** periodically. Fix non-breaking issues with `npm audit fix`. If critical issues remain (e.g. Next.js, eslint), plan an upgrade:

- **Frontend**: Upgrade Next.js to a patched 14.x (e.g. 14.2.x) or 15.x to address known CVEs.
- **Backend**: Consider migrating from `aws-sdk` v2 to `@aws-sdk/*` v3 when possible (v2 has a region-validation advisory).

## Production logs

- **Backend**: Uses `backend/src/utils/logger.ts`. In production, `info`/`debug` are no-ops; `error`/`warn` log only redacted messages (emails, tokens, API keys, Bearer tokens, long strings are redacted). Do not use `console.log`/`console.error` for anything that could contain secrets or PII; use `logger` instead.
- **Frontend**: In production builds, all `console.*` calls are stripped via Next.js `compiler.removeConsole`, so nothing is written to the browser console.
</think><｜tool▁call▁begin｜>
TodoWrite
