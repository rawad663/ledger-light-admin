# Live Dashboard with Role Gating and Drill-Through CTAs

## Summary
- Replace the dashboard’s KPI cards, recent orders table, and low-stock watchlist with live data while keeping the `/` route thin and the feature page responsible for interactive behavior.
- Restrict `/` to `OWNER` and `MANAGER`: redirect every other role to `/products`, and hide the Dashboard item from the sidebar for those roles.
- Expand product and inventory backend support for true per-product reorder thresholds and richer low-stock responses, because the current global threshold cannot satisfy the requested behavior.
- Keep the sales chart mock for now, but label it clearly as a placeholder.

## Key Changes
- Add `reorderThreshold` to the `Product` model as an integer with default `10`, expose it in DTOs, validation, seed data, generated frontend types, and product create/edit forms.
- Add a dedicated `GET /dashboard/summary` endpoint returning `todaysSalesCents`, `ordersTodayCount`, `lowStockItemsCount`, and `activeCustomersCount`, with access limited to `OWNER` and `MANAGER`.
- Compute summary KPIs using `CONFIRMED` and `FULFILLED` orders only, bucketed by `placedAt`, and compute active customers from `status = ACTIVE`.
- Extend `GET /inventory` aggregated responses to include `reorderThreshold`, `isLowStock`, `stockGap`, `totalQuantity`, and the per-location quantity breakdown needed for the dashboard.
- Support low-stock dashboard queries through `GET /inventory` with `lowStockOnly=true`, a small dashboard limit, and severity sorting by `stockGap desc` then product name.
- In the `/` page server component, read auth from cookies, redirect unauthorized roles to `/products`, fetch initial summary, recent orders, and low-stock data, and pass that data into the dashboard feature component.
- Refactor the dashboard feature into a live-data page with section-level loading and error states while preserving server-loaded initial data for fast first render.
- Replace KPI mocks with live values from `/dashboard/summary`.
- Replace recent orders with `GET /orders` using the same query model as the orders page for shared filters and sort semantics. Render order ID, customer, status, total, and timestamp from live data.
- Add a `View More` button to Recent Orders that navigates to `/orders` carrying the same dashboard-visible order filters and sort parameters, so the destination page represents the same slice of data but under the full pagination UX of `/orders`. Do not special-case removal of `limit` or cursor params in the dashboard code; the `/orders` page should resolve its own standard pagination behavior from its existing defaults.
- Reuse the existing `CreateOrderForm` sheet on the dashboard button so “Create Order” opens exactly like `/orders`.
- Replace the low-stock watchlist with live aggregated inventory data. Each item should show product name, SKU, reorder threshold, total on-hand quantity, and a per-location breakdown like `Montreal: 3, Toronto: 2`.
- Add a `View More` CTA to the low-stock section that links to `/inventory?lowStockOnly=true`.
- Keep the chart on mock data and add placeholder copy/badge so it is clearly not live analytics.

## Public API / Type Additions
- `ProductDto`, `CreateProductDto`, and `UpdateProductDto` gain `reorderThreshold`.
- `GET /inventory` aggregated item payload gains:
  - `reorderThreshold: number`
  - `isLowStock: boolean`
  - `stockGap: number`
  - existing per-location quantities preserved for dashboard display
- `GET /inventory` query contract gains `lowStockOnly` for aggregated inventory as well as sortable dashboard-friendly ordering.
- New `GET /dashboard/summary` response shape:
  - `todaysSalesCents: number`
  - `ordersTodayCount: number`
  - `lowStockItemsCount: number`
  - `activeCustomersCount: number`

## Test Plan
- Backend tests for product create/update validation and persistence of `reorderThreshold`.
- Backend tests for aggregated inventory low-stock filtering, per-product threshold logic, deficit sorting, and location breakdown payload shape.
- Backend tests for dashboard summary metric math and manager/owner-only access.
- Frontend tests for `/` redirecting unauthorized roles to `/products`.
- Frontend tests for sidebar Dashboard link visibility by role.
- Frontend tests for recent orders live rendering and the `View More` link preserving the dashboard’s order filters/sort while landing on the normal paginated `/orders` experience.
- Frontend tests for low-stock live rendering, total plus per-location breakdown display, and the `/inventory?lowStockOnly=true` CTA.
- Frontend tests for Create Order opening the existing sheet flow.
- Frontend tests for section loading skeletons, inline error alerts, and placeholder chart labeling.

## Assumptions
- Redirect target for unauthorized dashboard access is `/products`.
- New and existing products default to `reorderThreshold = 10` unless changed.
- “Today’s Sales” and “Orders Today” use `CONFIRMED` and `FULFILLED` orders only, grouped by `placedAt`.
- KPI trend deltas are removed or neutralized rather than faked.
- The recent-orders drill-through preserves only dashboard-meaningful view state such as search, status, location, and sort; pagination on `/orders` continues to be owned by the orders page itself.
