

# Convert Business Configuration from Modal to Settings Page

## Problem
The "Business" settings category opens as a popup dialog (`BusinessSettingsDialog`) instead of rendering inline via `SettingsCategoryDetail` like every other settings category. This breaks the cohesive settings hub pattern — no back button, no page header, no description, and a cramped modal layout.

## Approach
Convert the dialog content into a new `BusinessSettingsContent` component that renders inside `SettingsCategoryDetail` with tabs, matching the pattern used by Email, System, and other multi-section categories.

## Tab Structure
The existing dialog has 4 logical sections separated by `<Separator>` — these become tabs:

| Tab | Content |
|-----|---------|
| **Identity** | Business name, legal name, EIN, default tax rate |
| **Brand Assets** | Light/dark logos + secondary icons (with upload cards) |
| **Address** | Mailing address, city, state, ZIP |
| **Contact** | Phone, email, website |

## File Changes

| # | File | Change |
|---|---|---|
| 1 | **New:** `src/components/dashboard/settings/BusinessSettingsContent.tsx` | Extract the form logic from `BusinessSettingsDialog.tsx` into a standalone component (no `Dialog` wrapper). Organize into `Tabs` with the 4 tabs above. Keep the sticky save footer, dirty-state tracking, logo/icon upload logic, and trim utility intact. |
| 2 | `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Add `{activeCategory === 'business' && <BusinessSettingsContent />}` in the Suspense block alongside the other category renders. Add lazy import. |
| 3 | `src/pages/dashboard/admin/Settings.tsx` | Remove the `businessDialogOpen` state, `BusinessSettingsDialog` import, and its render. Change `handleCategoryClick` for `'business'` from `setBusinessDialogOpen(true)` to `setActiveCategory('business')` so it follows the standard flow. |

## Result
- Business Configuration renders as a full settings page with `DashboardPageHeader` (title, description, back button) — identical to Email, Users, System, etc.
- The modal and its state management are removed entirely.
- All upload, validation, and save logic is preserved — just re-housed in a page layout with tabs.

