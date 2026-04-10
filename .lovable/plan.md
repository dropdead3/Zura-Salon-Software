

# Audit Pass — Remaining Fixes

## Issues Found

### 1. SalesDashboard still has hardcoded legacy `window.location.href` (Bug — missed in last pass)
Line 830 still uses `window.location.href = '/dashboard/admin/phorest-settings'` — a hardcoded legacy path causing a full page reload and losing org-slug context. The file already imports `useNavigate` and `useOrgDashboardPath`, so the fix is simply changing the onClick handler.

### 2. ColorBarSubscription uses `window.location.href` with `dashPath` (Bug — partial fix)
Line 114 was updated to use `dashPath()` for the correct path, but still uses `window.location.href =` which triggers a full page reload instead of a client-side navigation. Should use `navigate(dashPath(...))` like the other fixes. The file already imports `useNavigate`.

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/SalesDashboard.tsx` | Replace `window.location.href = '/dashboard/admin/phorest-settings'` with `navigate(dashPath('/admin/phorest-settings'))` |
| `src/pages/dashboard/admin/ColorBarSubscription.tsx` | Replace `window.location.href = dashPath(...)` with `navigate(dashPath('/admin/color-bar-settings'))` |

Both files already have `useNavigate` and `useOrgDashboardPath` imported — these are one-line fixes each.

