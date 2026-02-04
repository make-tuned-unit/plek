# SQL scripts

One-off and migration SQL for Supabase. Run in **Supabase Dashboard → SQL Editor** (or `psql` with your connection string).

- **supabase_database_setup.sql** – Base schema (tables, RLS, triggers).
- **fix_*.sql**, **add_*.sql**, **enable_*.sql**, etc. – Fixes and additions (RLS, triggers, enums).
- **fix_security_definer_views.sql** – Recreate views with `security_invoker = on` (linter 0010).
- **fix_function_search_path_mutable.sql** – Set `search_path = public` on functions (linter 0011).
- **make_admin.sql** – Grant admin to a user by email.

**Auth: Leaked password protection** – Supabase Security Advisor may warn that leaked password protection is disabled. Enable it in **Dashboard → Authentication → Settings → Security** (or [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). This is an Auth config setting, not a SQL change.

Do not commit `.env` or credentials; use env vars or placeholders in docs.
