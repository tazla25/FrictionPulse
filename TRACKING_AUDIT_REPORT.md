# Widget Tracking and View Audit Report

## 1. Event Triggers
- **Widget Impression (`logView`)**: Triggered strictly on widget initialization (`init()`).
- **Visitor Count**: Triggered on `init()` and polled every 30 seconds via `fetchVisitorCount()`.

## 2. Internal/Admin Page Isolation
- Dashboards (`/dashboard`, `dashboard.html`) previously recorded widget views during initial page loads and widget preview interactions.
- A programmatic guard was added inside `logView()` to completely reject any view logging from internal URL patterns. The widget UI will still render for previews or merchant support, but the analytics database will ignore the impressions.

## 3. Duplicate Prevention Mechanism
- Previously, a hard reload or navigating to the exact same URL within the same tab would artificially inflate the `widget_views` table.
- Added a browser `sessionStorage` deduplication lock keyed to the `site_key`. Navigations or repeated loads of the same URL within an active session will no longer log duplicate metrics.

## 4. Impact on Plan Limits
- Because widget views and lead conversion counts dictate plan limits, closing the internal and duplication loopholes directly corrects inflated plan usage metrics, ensuring Merchants are only billed for authentic, customer-facing interactions.
