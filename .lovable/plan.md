

# Move Zura Configuration & Points/Rewards from Operations Hub to Settings

## Problem

Two items in the Operations Hub are configuration/settings concerns, not daily operational tasks:
1. **Zura Configuration** (AI personality, knowledge, guardrails) — belongs in Settings under Platform
2. **Points & Rewards Config** — redundant since Settings already has a "Team Rewards" card that renders `TeamRewardsConfigurator`

Additionally, the "Points & Rewards Config" title in Ops Hub is ambiguous — it could be mistaken for client-facing loyalty rewards rather than staff incentives.

## Changes

### 1. Remove from Operations Hub (`src/pages/dashboard/admin/TeamHub.tsx`)

- Remove the "Points & Rewards Config" `ManagementCard` (lines 427-432) — Settings already covers this via the "Team Rewards" card
- Remove the "Zura Configuration" `ManagementCard` and the entire "AI & Automation" `CategorySection` (lines 441-449)

### 2. Add Zura Configuration to Settings

**`src/hooks/useSettingsLayout.ts`**:
- Add `'zura-config'` to `DEFAULT_ICON_COLORS` with a Brain-appropriate color (e.g., `'#A855F7'`)
- Add `'zura-config'` to the `platform` section in `SECTION_GROUPS`

**`src/pages/dashboard/admin/Settings.tsx`**:
- Add `'zura-config'` entry to `categoriesMap` with label "Zura Configuration", Brain icon, and appropriate description
- Add navigation handler: clicking it navigates to `/admin/zura-config` (same pattern as `access-hub` and `data-import`)

### 3. Rename "Team Rewards" for clarity

In `src/pages/dashboard/admin/Settings.tsx`, update the `team-rewards` entry:
- Label: **"Staff Rewards"** (clearer that it's internal team incentives, not client-facing)
- Description updated to emphasize staff/team context

Also update the Ops Hub card title reference if it appears elsewhere.

## Result

- Operations Hub becomes purely operational (daily management tasks)
- Settings gains "Zura Configuration" under Platform and renames "Team Rewards" → "Staff Rewards"
- No duplicate entry points for the same configuration

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/TeamHub.tsx` | Remove Points & Rewards Config card and AI & Automation section |
| `src/pages/dashboard/admin/Settings.tsx` | Add `zura-config` to categoriesMap + nav handler; rename `team-rewards` → "Staff Rewards" |
| `src/hooks/useSettingsLayout.ts` | Add `zura-config` to icon colors and Platform section group |

