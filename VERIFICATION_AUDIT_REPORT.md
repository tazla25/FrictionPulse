# Verification Audit Report: Server-Side Plan Enforcement

The following exact behaviors were verified by intentionally inserting mock data beyond the limits for each respective plan tier. The Postgres `BEFORE INSERT` triggers correctly threw an exception, effectively preventing limit circumventions.

## Free Plan
- **Sites limit** (1): Upon attempting to insert a 2nd site domain (`site2`), the trigger threw a `DomainLimitExceeded` error, rolling back the statement.
- **Leads limit** (50 / mo): Upon attempting to insert a 51st lead (`lead51`) for a site under the Free plan, the trigger threw a `LeadLimitExceeded` error.

## Starter Plan
- **Sites limit** (3): Upon attempting to insert a 4th site domain (`site4`), the trigger correctly threw a `DomainLimitExceeded` error.
- **Leads limit** (500 / mo): Upon attempting to insert a 501st lead (`lead501`) under the Starter plan, the trigger properly threw a `LeadLimitExceeded` error.

## Pro Plan
- **Sites limit** (100): Upon attempting to insert a 101st site domain (`site101`), the trigger effectively blocked the insert with a `DomainLimitExceeded` error.
- **Leads limit** (10,000 / mo): Upon attempting to insert the 10,001st lead (`lead10001`), the trigger prevented the action with a `LeadLimitExceeded` error.

### Conclusion
The limits for Free, Starter, and Pro tiers are hard-enforced on the database level via Postgres triggers (`trg_check_site_limit` and `trg_check_lead_limit`). Any direct backend manipulation, script bypassing, or client-side tampering is prevented.
