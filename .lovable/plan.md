

# Add Description to All Settings Detail Pages

## Problem
Settings detail pages show the page title via `DashboardPageHeader` but have no description underneath. The back button was already added. The descriptions already exist in the `categoriesMap` in `Settings.tsx` but are not passed through to `SettingsCategoryDetail`.

## Fix Plan

| # | File | Change |
|---|---|---|
| 1 | `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Add `categoryDescription` prop to `SettingsCategoryDetailProps`. Pass it as `description` to `DashboardPageHeader`. |
| 2 | `src/pages/dashboard/admin/Settings.tsx` (line 160) | Pass `categoryDescription={categoriesMap[activeCategory]?.description ?? ''}` to `SettingsCategoryDetail`. |

## Result
Every settings detail page displays the category description (e.g. "Configure your Zura Pay hardware fleet, purchase readers, monitor connectivity, and preview checkout display") directly under the page title, consistent with other hub pages like Website Hub, Day Rate Settings, etc.

