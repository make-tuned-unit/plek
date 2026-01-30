# Run schema on new Supabase production project

Use this in your **new production** Supabase project only. Run in the **SQL Editor** in order.

---

## 1. Open SQL Editor in production project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your **production** project (the one you just created).
3. In the left sidebar, click **SQL Editor**.

---

## 2. Run these files in order

Run each script **one at a time** in the SQL Editor (copy/paste the file contents, then click **Run**). Order matters.

| Order | File | What it does |
|-------|------|--------------|
| 1 | `supabase_database_setup.sql` | Core schema: enums, tables, indexes, RLS, triggers |
| 2 | `add_review_reminder_notification_type.sql` | Adds `review_reminder` to notification_type enum |
| 3 | `add_stripe_status_column.sql` | Adds `stripe_account_status` to users |
| 4 | `create_review_reminder_trigger.sql` | Trigger for review reminders |
| 5 | `update_user_ratings_trigger.sql` | Trigger for user ratings |
| 6 | `fix_reviews_schema.sql` | Fixes reviews schema if needed |
| 7 | `messages_rls_policy.sql` | RLS for messages |
| 8 | `fix_property_photos_rls.sql` | RLS for property photos |
| 9 | `property_photos_service_role_policy.sql` | Service role policy for photos |
| 10 | `add_missing_rls_policies.sql` | Any other RLS policies |
| 11 | `supabase_storage_setup.sql` | Storage bucket(s) for property photos |
| 12 | `supabase_avatars_bucket_setup.sql` | Storage bucket for avatars |

**Optional (skip if not needed):**

- `fix_function_search_path.sql` – only if you hit function search path errors
- `make_admin.sql` – only when you want to make a user admin (edit the user ID inside first)

**Do not run on production:**  
`temporary_rls_disable.sql`, `simple_rls_fix.sql`, `final_rls_fix.sql`, `supabase_storage_cleanup.sql`, `enable_verifications_rls.sql` (unless you use verifications) – these were one-off fixes for staging.

---

## 3. Where the files are

All `.sql` files are in the **root** of your Plek repo (same folder as `README.md`). Open each file, copy its full contents, paste into the Supabase SQL Editor, then Run.

---

## 4. After running

1. In Supabase: **Table Editor** – confirm tables exist (users, properties, bookings, messages, notifications, etc.).
2. In Supabase: **Authentication** – confirm Auth is enabled (it is by default).
3. In Supabase: **Storage** – confirm buckets from steps 11–12 exist.
4. Then add your production Supabase URL and keys to **Railway** (production backend env vars) as in the previous step.
