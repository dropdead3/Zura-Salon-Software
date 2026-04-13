

# Audit: Gaps, Bugs, and Enhancements

## Bugs

### 1. Broken "Activate Zura Pay" link in Payment Ops
**File:** `src/pages/dashboard/admin/PaymentOps.tsx` (line 1079)

`dashPath` returns a path string (e.g. `/org/123/dashboard`), but the code uses it as a URL prefix with string concatenation:
```ts
window.location.href = `${dashPath}/admin/settings?tab=terminals`
```
This produces a malformed URL. It should use `navigate(dashPath('/admin/settings?category=terminals'))` or the equivalent. Additionally, the settings page uses `?category=` not `?tab=`.

### 2. Native `confirm()` dialogs used for destructive actions
**Files:** `SettingsCategoryDetail.tsx` (line 437), `HandbooksContent.tsx` (line 182), and 10+ other files.

The platform uses `AlertDialog` for financial confirmations but falls back to browser-native `confirm()` for user deactivation, handbook deletion, station deletion, etc. Native dialogs break the luxury UI contract, cannot be styled, and appear out-of-place.

### 3. Settings `?category=` URL param not synced with `activeCategory` state on mount
**File:** `src/pages/dashboard/admin/Settings.tsx` (lines 95-103)

The initial category is read from `searchParams.get('category')` on mount, but:
- After clicking the back button (`setActiveCategory(null)`), the URL still contains `?category=xxx`, so refreshing the page re-opens the detail view instead of showing the hub.
- Navigating with `?category=terminals` works on first load but the param is never cleared when going back.

## Gaps

### 4. No `backTo`/`backLabel` on several hub-to-detail pages
**Files:** Multiple pages using `DashboardPageHeader`

The following pages have `DashboardPageHeader` without a back button:
- `GraduationTracker` (line 1004) — no `backTo`, should point to Operations Hub
- `ShiftSwapMarketplace` (line 71) — no `backTo`
- `Training` (line 171) — no `backTo`

### 5. Payment Ops description is stale
**File:** `src/pages/dashboard/admin/PaymentOps.tsx` (line 941)

Description says "Till reconciliation, deposit holds, and refund processing" but the page now also has Payouts, Fee Charges, Disputes, and Tip Distributions tabs. The description should reflect the full scope.

### 6. Tip Distribution tab doesn't respect the shared filter bar
**File:** `src/pages/dashboard/admin/PaymentOps.tsx` (line 817)

`showFilters` excludes `payouts` and `reconciliation` tabs, so the shared location/date/search filter bar appears for `tips`. But `TipDistributionManager` has its own internal date picker and ignores the parent filter state entirely. This creates a confusing UX with two date controls visible simultaneously.

## Enhancements

### 7. `PageExplainer` only renders on the Settings hub — not on detail pages
**File:** `src/components/dashboard/settings/SettingsCategoryDetail.tsx` (line 450)

The `PageExplainer` uses a single `pageId="settings"` for all detail views. Category-specific explainers (e.g. `pageId="settings-zurapay"`) would provide better contextual help.

### 8. Missing keyboard shortcut for back navigation
The back button is mouse-only. Adding `Escape` or `Backspace` to return to the settings hub (when no dialog is open) would improve keyboard-driven workflows.

---

## Recommended Fix Plan

| # | File | Change |
|---|---|---|
| 1 | `PaymentOps.tsx` (line 1079) | Replace `window.location.href` with `navigate(dashPath('/admin/settings?category=terminals'))` |
| 2 | `PaymentOps.tsx` (line 941) | Update description to "Payouts, reconciliation, deposits, refunds, disputes, and tip distributions" |
| 3 | `PaymentOps.tsx` (line 817) | Add `'tips'` to `showFilters` exclusion list since `TipDistributionManager` has its own date picker |
| 4 | `Settings.tsx` | Clear `?category` search param when `setActiveCategory(null)` is called (back button) |
| 5 | `SettingsCategoryDetail.tsx` (line 437) | Replace `confirm()` with `AlertDialog` for user deactivation |
| 6 | `GraduationTracker.tsx` | Add `backTo={dashPath('/admin/team-hub')}` and `backLabel="Operations Hub"` |
| 7 | `ShiftSwapMarketplace.tsx` | Add `backTo` pointing to the appropriate parent hub |
| 8 | `Training.tsx` | Add `backTo` pointing to the appropriate parent hub |

