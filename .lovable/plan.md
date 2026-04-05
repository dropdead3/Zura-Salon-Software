

# Move Team Distribution Card to Team Roster Tab

## What Changes

The "Team Distribution" summary card (level-by-level bar chart showing stylist counts and percentages) is currently rendered at the bottom of the **Levels** tab. It belongs at the top of the **Team Roster** tab, where it provides context before the roster table.

## Technical Details

**File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`**

1. **Remove** the Team Distribution block from the Levels tab (lines 1247–1286)
2. **Insert** the same block at the top of the Team Roster `TabsContent` (line 1315), rendered above `TeamCommissionRoster` — gated by `levels.length > 0`

One file, cut-and-paste relocation. No logic changes.

