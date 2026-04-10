

# Fix: Wrap AppsMarketplace in DashboardLayout

## Problem

The Zura Apps page renders outside the dashboard shell (no sidebar, no top bar) because `AppsMarketplace` doesn't wrap its content in `<DashboardLayout>`. Every other dashboard page does this — `DashboardLayout` is not applied at the route level; each page component is responsible for including it.

## Change

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` | Import `DashboardLayout` and wrap the page content in `<DashboardLayout>...</DashboardLayout>` |

This is a one-line structural fix — add the import and wrap the existing JSX return.

