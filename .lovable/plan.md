

# Backroom Setup Wizard — Implementation Plan

## Overview

A guided, multi-step wizard for first-time Backroom configuration. Modeled after the existing `DashboardSetupWizard` pattern (framer-motion step transitions, Card-based layout). Launched from the BackroomSetupOverview when setup progress is incomplete, or via a "Launch Setup Wizard" button.

## Steps (5 total)

1. **Welcome** — Explain what Backroom does, what gets configured. Single CTA to begin.
2. **Select Products** — Show all org products with checkboxes. Bulk-select by category. Toggle `is_backroom_tracked`, set `depletion_method` and `cost_per_gram`/`cost_price` inline. Reuses the same query pattern as `BackroomProductCatalogSection`.
3. **Map Services** — Show tracked services with toggles for `is_backroom_tracked`. For each tracked service, allow adding tracking components (product → service mapping) via inline selects. Reuses `useServiceTrackingComponents`.
4. **Set Allowances** — For each tracked service, create a simple allowance policy: included qty, unit, overage rate. Reuses `useServiceAllowancePolicies` + `useUpsertAllowancePolicy`.
5. **Configure Station** — Create at least one mixing station: name + location. Reuses `useCreateBackroomStation`. Final step shows summary and "Complete Setup" button.

Each step has Back/Next navigation, a progress indicator, and a "Skip" option. Completing the wizard sets a `backroom_settings` key (`setup_wizard_completed: true`) via `useUpsertBackroomSetting`.

## Files

| File | Action |
|---|---|
| `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` | New — main wizard component with 5 step sub-components |
| `src/components/dashboard/backroom-settings/BackroomSetupOverview.tsx` | Edit — add "Launch Setup Wizard" button when incomplete, conditionally render wizard |
| `src/pages/dashboard/admin/BackroomSettings.tsx` | Minor edit — pass wizard launch state down if needed |

## Technical Details

- **State management:** Local `useState` for current step + per-step form state. No new hooks needed — all CRUD hooks already exist.
- **Animation:** `framer-motion` `AnimatePresence` with slide transitions (matching `DashboardSetupWizard` pattern).
- **Products step:** Fetches products with `supabase.from('products').select(...)`. Renders checkbox list grouped by category. Inline cost input for selected items. Saves via bulk update mutation on "Next".
- **Services step:** Fetches services, shows only those with tracked products available. Uses existing `useUpsertTrackingComponent` for product-to-service mapping.
- **Allowances step:** Simple form per tracked service — included qty (number), unit (select: g/ml/oz), overage rate (number). Creates policy via `useUpsertAllowancePolicy`.
- **Station step:** Name + location select. Creates via `useCreateBackroomStation`.
- **Completion:** Calls `useUpsertBackroomSetting` with key `setup_wizard_completed`, then navigates to overview.
- **Re-entry:** Overview checks if `setup_wizard_completed` is set. If not and progress < 100%, shows prominent wizard CTA. Wizard can always be re-launched manually.

## Build Order

1. Create `BackroomSetupWizard.tsx` with all 5 steps
2. Wire into `BackroomSetupOverview.tsx` with launch button and auto-show logic

