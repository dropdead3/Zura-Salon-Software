

# Fix Settings Detail Pages: Back Button + Remove Redundant Header

## Problem

1. **No back button** — `SettingsCategoryDetail` renders `DashboardPageHeader` without `backTo`, so there's no way to navigate back to the Settings hub from any settings detail page (Zura Pay, Email, Users, etc.).

2. **Redundant header on Zura Pay** — `TerminalSettingsContent` renders its own "ZURA PAY" icon + title + description (lines 373-383), duplicating the parent `DashboardPageHeader` which already shows "ZURA PAY" as the page title. The screenshot confirms "ZURA PAY" appears twice.

## Fix Plan

| # | File | Change |
|---|---|---|
| 1 | `src/components/dashboard/settings/SettingsCategoryDetail.tsx` (line 448) | Add `backTo={dashPath('/admin/settings')}` and `backLabel="Back to Settings"` to the `DashboardPageHeader`. This applies to **all** settings detail pages uniformly. |
| 2 | `src/components/dashboard/settings/TerminalSettingsContent.tsx` (lines 373-383) | Remove the redundant icon + title + description block ("ZURA PAY" / "In-person payment infrastructure..."). The parent `DashboardPageHeader` already provides the page title. |

## Result

- Every settings detail page gets a consistent back arrow to return to the Settings hub.
- Zura Pay no longer shows a duplicate header. The page title comes from `DashboardPageHeader` like all other settings pages.

