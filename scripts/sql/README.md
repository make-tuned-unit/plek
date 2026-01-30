# SQL scripts

One-off and migration SQL for Supabase. Run in **Supabase Dashboard → SQL Editor** (or `psql` with your connection string).

- **supabase_database_setup.sql** – Base schema (tables, RLS, triggers).
- **fix_*.sql**, **add_*.sql**, **enable_*.sql**, etc. – Fixes and additions (RLS, triggers, enums).
- **make_admin.sql** – Grant admin to a user by email.

Do not commit `.env` or credentials; use env vars or placeholders in docs.
