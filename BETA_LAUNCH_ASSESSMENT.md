# Production-Ready Beta Assessment – Plekk

**Date:** Today  
**Goal:** Release a production-ready Beta.

---

## Are we close?

**Yes, with a few critical fixes.** Core flows work (auth, bookings, payments, messaging, profile). Staging is deployed. The main gaps are **secrets hygiene**, **auth hardening**, and **confirming production config** (env, CORS, Stripe).

---

## 1. API keys and secrets

### Current state
- **Code:** Secrets are read from `process.env` only; no keys hardcoded in app code.
- **.gitignore:** `.env`, `.env.*`, `*.env` are ignored; `.env` and `backend/.env` are **not** in the repo (confirmed).
- **SECURITY_GUIDE.md** warns that secrets were previously detected in git history (e.g. by GitGuardian).

### What you must do before beta
1. **Assume history may be compromised**
   - If secrets were ever committed, treat Supabase keys, Stripe keys, RESEND_API_KEY, JWT_SECRET, and any `.env` backups as exposed.
2. **Rotate before go-live**
   - **Supabase:** New anon key and service role key (Dashboard → Settings → API).
   - **Stripe:** New secret key and webhook secret for production (or at least new webhook secret if you already use live keys).
   - **Resend:** New API key (Dashboard).
   - **JWT_SECRET:** Generate a strong random value (e.g. `openssl rand -base64 32`) and set in production only.
3. **Production env only**
   - Set all production secrets in Railway (backend) and Vercel (frontend) **environment variables**, not in repo or in committed files.
4. **Optional but recommended**
   - Add a pre-commit hook (e.g. GitGuardian or a simple pattern check) to block commits that look like secrets.

**Verdict:** Keys are not “secured” until rotated and stored only in env (and any past exposure in history is addressed). Do the rotation and env check before calling the beta production-ready.

---

## 2. User safety and privacy

### Current state
- **Auth:** Supabase Auth handles sign-up, login, and sessions; passwords are not stored in your DB.
- **API access:** Protected routes use `protect` middleware and Supabase JWT verification; user is attached to `req.user`.
- **Privacy policy:** In place (`/privacy`) and covers collection, use, sharing, security, and choices.
- **Data in API:** User-scoped data (bookings, messages, profile) is filtered by `user.id` or booking membership; no raw DB dump exposed.

### What to double-check
- **CORS:** Backend uses `FRONTEND_URL` (and localhost for dev). For production, set `FRONTEND_URL` to the exact beta domain (e.g. `https://parkplekk.com`) so only your frontend can call the API.
- **Terms + Privacy:** Ensure links are visible (e.g. footer/signup) and that you’re comfortable with the current policy for a paid beta.

**Verdict:** User safety and privacy are in good shape for a beta, provided CORS and legal links are correct and you’re not logging PII unnecessarily.

---

## 3. Passwords and protection against hacking

### Current state
- **Passwords:** Handled entirely by Supabase (hashing, storage, verification). You never see or store plaintext passwords.
- **Sign-up:** Frontend enforces min 8 characters; backend delegates to Supabase.
- **Sign-in:** Frontend allows 6+ characters; consider aligning to 8 for consistency.
- **Security middleware:** Helmet (headers), CORS (origin restrict), rate limit on `/api/` (100 req / 15 min per IP).
- **Stripe:** Webhook uses `STRIPE_WEBHOOK_SECRET` for signature verification; payment routes are protected.
- **Errors:** Stack traces and internal details only in development; production responses are sanitized.

### Gaps to fix for beta
1. **Stricter rate limit on auth**
   - Add a dedicated rate limiter for `POST /api/auth/login` (and optionally `POST /api/auth/register`) to reduce brute-force and credential stuffing (e.g. 5–10 attempts per 15 min per IP).
2. **JWT_SECRET**
   - If you use a custom JWT anywhere, ensure production uses a strong, unique value (not the placeholder in `env.example`).
3. **HTTPS only**
   - Ensure production frontend and backend are served over HTTPS only (Vercel/Railway do this by default with their domains).

**Verdict:** Passwords are in Supabase’s hands and well protected. Locking down auth with stricter rate limiting and confirming HTTPS + JWT_SECRET will make the beta much safer against common attacks.

---

## 4. Pre–beta checklist (today)

### Must-do
- [ ] Rotate Supabase anon + service role keys and set new values in production env only.
- [ ] Rotate Stripe keys (or at least webhook secret) and set in production env.
- [ ] Rotate RESEND_API_KEY and set in production env.
- [ ] Set a strong, unique `JWT_SECRET` in production (backend).
- [ ] Set `NODE_ENV=production` for backend and frontend in production.
- [ ] Set `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to the real beta URLs (no localhost in prod).
- [ ] Add a stricter rate limit on `POST /api/auth/login` (e.g. 5–10 per 15 min per IP).

### Should-do
- [ ] Confirm CORS only allows your beta frontend origin.
- [ ] Align sign-in password validation to 8 characters minimum (optional but consistent).
- [ ] Quick smoke test: signup → login → create listing → book → pay (test mode) → messages.

### Nice-to-have
- [ ] Pre-commit hook to block commits that look like secrets.
- [ ] If SECURITY_GUIDE was based on real GitGuardian findings, consider history cleanup (e.g. BFG) and force-push, then re-rotate any secrets that were in history.

---

## Summary

| Area              | Status        | Action before beta                          |
|-------------------|---------------|---------------------------------------------|
| API keys secured  | Needs work    | Rotate keys; use only env; check history    |
| User safety       | Good          | Confirm CORS + legal links                  |
| Privacy           | Good          | Policy in place; no changes required       |
| Passwords         | Good          | Supabase; add auth rate limit + HTTPS check |
| Hacking protection| Good + 1 fix  | Add stricter login rate limiting            |

You’re close. **Do the “Must-do” list and the login rate limit**, and you can confidently call it a production-ready beta from a security and privacy standpoint.
