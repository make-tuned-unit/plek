# 🔑 Getting Your Webhook Secret

## Option 1: Check Terminal Output

When you ran `stripe listen --forward-to localhost:8000/api/payments/webhook`, it should have immediately shown:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Look for the line that says "Your webhook signing secret is whsec_..."**

Copy that entire `whsec_...` value.

---

## Option 2: Run It Again to See the Secret

If you can't find it, stop the current process and run it again:

1. **Stop the current Stripe CLI:**
   - Find the terminal where it's running
   - Press `Ctrl+C` to stop it

2. **Run it again in a visible terminal:**
   ```bash
   stripe listen --forward-to localhost:8000/api/payments/webhook
   ```

3. **Copy the webhook secret** from the output

4. **Keep that terminal open** - it needs to keep running to forward webhooks

---

## Option 3: Check Stripe CLI Logs

The webhook secret is also stored. You can check:

```bash
stripe listen --print-secret
```

This will show you the secret for the current session.

---

## Once You Have the Secret

Add it to your **backend `.env` file**:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Important:** 
- Keep the `stripe listen` command running while testing
- The secret starts with `whsec_`
- Restart your backend after adding the secret

---

## Quick Test

After adding the secret, you can test if webhooks are working:

1. Make a test payment
2. Check the Stripe CLI terminal - you should see webhook events being forwarded
3. Check your backend logs - you should see webhook handler logs





