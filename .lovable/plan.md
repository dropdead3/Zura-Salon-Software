

# Zura Backroom Platform Manager — Fix & Enhance

## Current State

The platform Backroom admin at `/dashboard/platform/backroom` has 4 tabs: Price Queue, Price Sources, Entitlements, and Supply Library. All are functional but basic. The screenshot confirms the current UI renders correctly. Here's the enhancement plan across all four areas plus a new Analytics/Metrics tab.

---

## 1. Supply Library Improvements

**Pagination**: Replace the hard `slice(0, 100)` with proper cursor-based pagination using "Load More" or page controls — querying with `.range()` for efficient DB access.

**Bulk CSV Import**: Add a "Import CSV" button next to "Add Product" that accepts a CSV file (brand, name, category, unit, sizes), parses it client-side, previews the rows in a confirmation dialog, then batch-inserts.

**Category management**: Add a category filter dropdown alongside the brand filter. Add a "Manage Categories" section allowing admins to view product counts per category.

**Inline editing**: Make brand, category, depletion, and unit cells editable inline (click-to-edit pattern matching the existing retail product table) to avoid opening the dialog for single-field changes.

**Export**: Add a "Export CSV" button that downloads current filtered results.

---

## 2. Price Queue Enhancements

**Inline price editing**: Allow admins to adjust the `wholesale_price` before approving — useful when the fetched price needs minor correction. Add an inline input that pre-fills with the fetched value.

**Rejection notes**: When rejecting, show a small textarea dialog for entering a reason (stored in `notes` column).

**Price history**: Add a "View History" action per product that opens a sheet/dialog showing all past queue entries for that product (approved, rejected, auto-applied) sorted by date.

**Bulk reject**: Add a "Reject Selected" button alongside the existing "Approve Selected".

**Brand filter**: Add a brand dropdown filter next to the status filter.

**Pagination**: Add pagination controls (the queue could grow large).

---

## 3. Entitlements & Billing Visibility

Enhance the Entitlements tab to show richer data per organization:

**Additional columns**: Plan tier (`subscription_tier`), subscription status, Backroom plan (from `override_reason` metadata which stores plan tier), scale count, trial status — all sourced from the `organizations` table joined with `organization_feature_flags`.

**Status badges**: Show "Trial", "Active", "Cancelled", "Inactive" with color-coded badges.

**Bulk enable/disable**: Checkbox selection with batch toggle.

**Expand row detail**: Click an org row to show a detail panel with: activation date, plan tier, billing email, subscription period, scale licenses.

---

## 4. New: Backroom Analytics Tab

Add a 5th tab — "Analytics" — providing platform-level Backroom metrics:

**Summary KPIs (top cards)**:
- Total Backroom-enabled orgs
- Total active trial orgs
- Backroom MRR (count of enabled orgs × avg plan price, or from Stripe data if available)
- Avg waste reduction across all orgs

**Adoption chart**: Organization adoption over time (count of `backroom_enabled` flags by `created_at`).

**Usage table**: Per-org usage stats sourced from `backroom_analytics_snapshots` — showing snapshot count, avg waste %, last snapshot date, product count.

**Data source**: Query `organization_feature_flags` (for entitlement data) + `backroom_analytics_snapshots` (for usage) + `organizations` (for billing info).

---

## 5. Audit Log Integration

Add audit logging calls to all admin actions (approve, reject, toggle entitlement, add/edit/delete supply products) using the existing `log_platform_action` database function — following the pattern already used elsewhere in the platform.

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `BackroomAdmin.tsx` | Add Analytics tab |
| `PriceQueueTab.tsx` | Inline edit, reject dialog, bulk reject, brand filter, pagination, history dialog |
| `PriceSourcesTab.tsx` | Minor: add audit logging on create/delete |
| `BackroomEntitlementsTab.tsx` | Join org data, show plan/billing columns, expand row, bulk toggle |
| `SupplyLibraryTab.tsx` | Pagination, inline edit, CSV import/export, category filter |
| `src/components/platform/backroom/BackroomAnalyticsTab.tsx` | New — KPIs + adoption + usage table |
| `src/components/platform/backroom/PriceHistoryDialog.tsx` | New — historical queue entries per product |
| `src/components/platform/backroom/RejectNoteDialog.tsx` | New — rejection reason textarea dialog |
| `src/components/platform/backroom/CSVImportDialog.tsx` | New — CSV upload + preview + batch insert |
| `src/hooks/platform/useWholesalePriceQueue.ts` | Add brand filter, pagination params |
| `src/hooks/platform/useBackroomPlatformAnalytics.ts` | New — aggregate queries for analytics tab |

No database migrations required — all data sources already exist.

