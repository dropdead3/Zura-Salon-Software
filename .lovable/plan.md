

# Fix Settings Back Button

## Problem
The back button in `DashboardPageHeader` uses a `<Link to={dashPath('/admin/settings')}>` — but the Settings page uses **component state** (`activeCategory`) to toggle between hub and detail views, not URL routing. Clicking the link navigates to the same URL without clearing state, so the detail view stays visible.

The `onBack` callback is already passed from `Settings.tsx` → `SettingsCategoryDetail` but is never wired to the back button.

## Fix

| # | File | Change |
|---|---|---|
| 1 | `src/components/dashboard/settings/SettingsCategoryDetail.tsx` (line 449) | Replace `backTo={dashPath('/admin/settings')}` with a custom back button that calls `onBack()` directly. Use a `Button` with `onClick={onBack}` + `ArrowLeft` icon instead of the `DashboardPageHeader` `backTo` prop (which renders a `<Link>`). |

Specifically, remove `backTo` and `backLabel` from the `DashboardPageHeader` props, and instead render the back button manually before the header — or add a new prop pattern to `DashboardPageHeader` that accepts an `onBack` callback alongside the existing `backTo` link approach.

### Cleanest approach
Add an optional `onBackClick` prop to `DashboardPageHeader`. When provided, render the back button with `onClick` instead of `<Link to>`. This keeps the component reusable and avoids duplicating the back button layout.

| # | File | Change |
|---|---|---|
| 1 | `src/components/dashboard/DashboardPageHeader.tsx` | Add optional `onBackClick?: () => void` prop. When set, render the back arrow as a `<Button onClick={onBackClick}>` instead of `<Link to={backTo}>`. |
| 2 | `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Replace `backTo={dashPath('/admin/settings')}` with `onBackClick={onBack}` on the `DashboardPageHeader`. |

