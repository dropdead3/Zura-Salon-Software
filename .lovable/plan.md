

# Organize Backroom Hub Sidebar into Grouped Sections

## Current State
The sidebar is a flat list of 13 items plus a separated "Subscription" link. No visual grouping or section headers exist.

## Proposed Grouping

```text
OPERATIONS
  Overview
  Inventory
  Suppliers
  Compliance

CONFIGURATION
  Products & Supplies
  Service Tracking
  Recipe Baselines
  Allowances & Billing
  Stations & Hardware
  Formula Assistance

SETTINGS
  Permissions
  Alerts & Exceptions
  Multi-Location
  ─────────────────
  Subscription
```

- **Operations** — daily monitoring surfaces (stock, suppliers, compliance logs)
- **Configuration** — setup items that define how backroom tracks and measures (products, services, recipes, allowances, stations, formulas)
- **Settings** — governance and admin controls (permissions, alerts rules, multi-location sync, subscription)

## Technical Changes

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`**

1. Add a `group` property to each `SectionMeta` entry (`'operations' | 'configuration' | 'settings'`).
2. Reorder the `sections` array to match the grouping above.
3. In the sidebar `<nav>`, render items grouped by `group` with a small uppercase label header (e.g., `text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 pt-4 pb-1`) before each group.
4. Move the "Subscription" link inside the Settings group (after the border separator, as it already is).
5. Update the mobile `<select>` to use `<optgroup>` labels matching the three groups.

No new files, no data changes. Purely a sidebar rendering reorganization.

