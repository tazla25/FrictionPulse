# FrictionPulse Production Readiness Audit & Launch Checklist

## 1. Analytics & View Counting
**Finding:** Widget impressions (`logView()`) now strictly skip tracking when the widget is rendered on internal domain patterns (e.g., `dashboard.html` or `/dashboard`). Furthermore, a browser `sessionStorage` lock deduplicates rapid reloads from artificially inflating `widget_views`. This completely stops merchant configuration time from counting against their tier limits.
**Severity:** Low (Verified Secure)

## 2. Server-Side Plan Limits
**Finding:** Database `BEFORE INSERT` triggers (`trg_check_site_limit`, `trg_check_lead_limit`) physically block users from inserting sites and capturing leads beyond their current plan limits. Attempted bypasses correctly throw `DomainLimitExceeded` and `LeadLimitExceeded`.
**Severity:** Low (Verified Secure)

## 3. Subscription Cancellation & Downgrade Flows
**Finding:** The downgrade/cancellation workflow in `dashboard.html` (`checkoutSubscription('free')`) attempts to downgrade users merely by directly calling a client-side `PATCH` to the `billing_subscriptions` table (`plan_tier: 'free'`).
This is fundamentally broken for two reasons:
1. Client-side update policies were recently removed from `billing_subscriptions` (to prevent unauthorized upgrades), meaning this client-side `PATCH` will silently fail or throw an RLS error.
2. Even if it succeeded, it **does not communicate with Razorpay**. The merchant's Razorpay mandate remains active, and they will continue to be billed indefinitely despite their dashboard showing a "Free" tier. A server-side Edge Function (`cancel-subscription`) must be implemented to hit the Razorpay API and cancel the mandate.
**Severity:** Critical 🚨

## 4. Widget Icon Consistency
**Finding:** The widget injection (`widget.js`) dynamically constructs an isolated Shadow DOM (`mode: 'open'`) to prevent CSS inheritance issues from the host site. The container and widget button rely on high z-index (`2147483647`), `position: fixed`, and bottom-right alignment, ensuring it remains visible over standard merchant page elements consistently.
**Severity:** Low (Verified Secure)

## 5. Razorpay Test-Mode Logic
**Finding:** The client-side mock bypass code has been fully removed from the dashboard. The `create-subscription` edge function handles test vs live configurations dynamically via `isTestMode = keyId.startsWith("rzp_test_");`. It properly references production environment variables (`RAZORPAY_PLAN_ID_STARTER`, etc.) when real keys are injected. No hardcoded mock bypasses remain.
**Severity:** Low (Verified Secure)

---

# Launch Blocker Checklist
Before onboarding the first paying merchant, the following blockers must be resolved:

- [ ] **BLOCKER (CRITICAL):** Create a `cancel-subscription` Supabase Edge Function to integrate with the Razorpay Cancellation API.
- [ ] **BLOCKER (CRITICAL):** Update the `dashboard.html` downgrade logic to invoke the `cancel-subscription` edge function instead of directly attempting a `PATCH` on the database.

*Launch cannot proceed until merchants can securely and definitively stop recurring charges via Razorpay.*
