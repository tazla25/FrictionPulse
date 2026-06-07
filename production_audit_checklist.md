# FrictionPulse Production Readiness Audit & Launch Checklist

## 1. Analytics & View Counting
**Finding:** Widget impressions (`logView()`) now strictly skip tracking when the widget is rendered on internal domain patterns (e.g., `dashboard.html` or `/dashboard`). Furthermore, a browser `sessionStorage` lock deduplicates rapid reloads from artificially inflating `widget_views`. This completely stops merchant configuration time from counting against their tier limits.
**Severity:** Low (Verified Secure)

## 2. Server-Side Plan Limits
**Finding:** Database `BEFORE INSERT` triggers (`trg_check_site_limit`, `trg_check_lead_limit`) physically block users from inserting sites and capturing leads beyond their current plan limits. Attempted bypasses correctly throw `DomainLimitExceeded` and `LeadLimitExceeded`.
**Severity:** Low (Verified Secure)

## 3. Subscription Cancellation & Downgrade Flows
**Finding:** The downgrade and cancellation flow was completely refactored. The `dashboard.html` now securely calls the `cancel-subscription` Supabase Edge Function via POST using the user's JWT. The edge function utilizes the `SUPABASE_SERVICE_ROLE_KEY` to retrieve the merchant's active `razorpay_subscription_id` and performs a secure, server-side cancellation against the Razorpay API (`cancel_at_cycle_end: 0`). After successful cancellation, it immediately updates the merchant's plan status to `cancelled` and tier to `free`. This effectively halts billing and safely synchronizes the dashboard UI without exposing database update privileges to the client.
**Severity:** Low (Verified Secure - Blocker Resolved)

## 4. Widget Icon Consistency
**Finding:** The widget injection (`widget.js`) dynamically constructs an isolated Shadow DOM (`mode: 'open'`) to prevent CSS inheritance issues from the host site. The container and widget button rely on high z-index (`2147483647`), `position: fixed`, and bottom-right alignment, ensuring it remains visible over standard merchant page elements consistently.
**Severity:** Low (Verified Secure)

## 5. Razorpay Test-Mode Logic
**Finding:** The client-side mock bypass code has been fully removed from the dashboard. The `create-subscription` edge function handles test vs live configurations dynamically via `isTestMode = keyId.startsWith("rzp_test_");`. It properly references production environment variables (`RAZORPAY_PLAN_ID_STARTER`, etc.) when real keys are injected. No hardcoded mock bypasses remain.
**Severity:** Low (Verified Secure)

---

# Launch Blocker Checklist
**All identified blockers have been resolved.**

✅ **Ready for Launch:** Merchants can securely subscribe, their usage limits are strictly enforced by the backend, and they can securely cancel their subscriptions to stop recurring billing via the Razorpay API integration.
