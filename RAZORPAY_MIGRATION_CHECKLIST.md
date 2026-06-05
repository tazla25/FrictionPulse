# Razorpay Test to Live Migration Checklist

When moving FrictionPulse from Razorpay Test Mode to Live Mode, follow these steps meticulously:

## 1. Configure Supabase Environment Variables

In your Supabase project dashboard (Settings -> Edge Functions), replace or set the following environment variables:

- [ ] Set `RAZORPAY_KEY_ID` to your **Live** Razorpay Key ID (starts with `rzp_live_`).
- [ ] Set `RAZORPAY_KEY_SECRET` to your **Live** Razorpay Key Secret.
- [ ] Set `RAZORPAY_PLAN_ID_STARTER` to the **Live** Plan ID for the Starter tier (e.g., `plan_XYZ`).
- [ ] Set `RAZORPAY_PLAN_ID_PRO` to the **Live** Plan ID for the Pro tier (e.g., `plan_ABC`).

*Note: Ensure you do NOT use `rzp_test_` keys in production. The edge function strictly uses test-mode logic when `rzp_test_` is detected. Test plans (`RAZORPAY_TEST_PLAN_ID_STARTER`, `RAZORPAY_TEST_PLAN_ID_PRO`) are ignored when live keys are provided.*

## 2. Update Webhooks

- [ ] In the Razorpay Dashboard (Live Mode), navigate to Webhooks.
- [ ] Ensure the webhook URL points to your Supabase Edge Function: `https://amtalgsyuedgayxkxijw.supabase.co/functions/v1/razorpay-webhook`
- [ ] Ensure the webhook is subscribed to at least `subscription.charged` and `subscription.activated` events.
- [ ] Obtain the Live Webhook Secret.
- [ ] In Supabase Environment Variables, set `RAZORPAY_WEBHOOK_SECRET` to your new Live Webhook Secret.

## 3. Restart Edge Functions

- [ ] Though Supabase auto-reloads environment variables on invocation, ensure Edge Functions are receiving the correct secrets by performing a test call or manually redeploying if necessary.

## 4. Frontend and Verification

- [ ] Attempt a ₹1 dummy subscription upgrade on the live instance (you can refund it later from the Razorpay dashboard).
- [ ] Verify the UI opens the actual Razorpay live payment window.
- [ ] After successful payment, verify that the `billing_subscriptions` table in Supabase correctly reflects `status: active` and the user is granted Pro/Starter limits.
