# GST/HST tax-on threshold (small supplier)

Tax stays **off** until Stripe revenue (CAD) reaches the small-supplier threshold ($30,000 CAD). Then `tax_mode` flips to **on** and NS bookings show/charge **HST (NS)** (15%).

## Env vars

| Variable | Description | Default |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API key (required for webhook + sync) | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (required for webhook) | — |
| `SMALL_SUPPLIER_THRESHOLD_CAD` | Revenue threshold in CAD; tax turns on when reached | `30000` |
| `NS_HST_RATE` | HST rate when tax is on (NS) | `0.15` |
| `CRON_SECRET` | Used to call `/api/cron/sync-tax-revenue` | — |

## Webhook (Stripe)

- **Endpoint:** `POST /api/payments/webhook` (raw body; no JSON middleware).
- **Events:** `charge.succeeded` (CAD only), `charge.refunded` (CAD only).
- **Idempotency:** Processed event IDs are stored in `stripe_revenue_events`; duplicate events are ignored.
- **Revenue:** Stored in `tax_config.revenue_cad_cents`. When revenue ≥ threshold, `tax_mode` is set to `on` and `tax_effective_at` is set.

### Run webhook locally (Stripe CLI)

```bash
stripe listen --forward-to localhost:8000/api/payments/webhook
```

Use the printed webhook signing secret as `STRIPE_WEBHOOK_SECRET` in your local env. Trigger test events with `stripe trigger charge.succeeded` (then adjust payload for CAD if needed).

## Backstop sync (cron)

- **Endpoint:** `GET` or `POST` `/api/cron/sync-tax-revenue`
- **Auth:** `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`
- **Behaviour:** Lists Stripe charges (CAD, last 120 days), sums `amount - amount_refunded`, updates `tax_config.revenue_cad_cents` and `revenue_last_synced_at`, and runs the same threshold check (turns tax on if over threshold).
- **Suggested schedule:** Daily (e.g. 2am).

## Canonical source: Stripe Charge

Revenue is derived from **Stripe Charges** (not only PaymentIntents):

- **charge.succeeded** → add `charge.amount` (CAD only) to revenue.
- **charge.refunded** → subtract refund delta (we track `stripe_charge_refunds` per charge so partial refunds are applied once).

PaymentIntents are still used for booking flow; the **resulting Charge** is what we use for revenue so the amount is correct after any Stripe fees/destination transfers.

## Admin

- **API:** `GET /api/admin/tax-config` (admin only) returns `tax_mode`, `tax_effective_at`, `revenue_cad`, `threshold_cad`, `revenue_last_synced_at`.
- **UI:** Admin dashboard shows a “GST/HST (small-supplier threshold)” section with tracked revenue, threshold, tax mode, effective date, and last synced.

## Checklist after deploy

1. Run SQL migration: `scripts/sql/add_tax_config_and_revenue_tracking.sql`
2. In Stripe Dashboard → Webhooks, add endpoint for `charge.succeeded` and `charge.refunded` (or use existing endpoint if it already receives these).
3. Schedule cron for `GET /api/cron/sync-tax-revenue` (e.g. daily).
4. Confirm `tax_config` has one row (`id = 'default'`, `tax_mode = 'off'`) and that revenue updates after test charges.
