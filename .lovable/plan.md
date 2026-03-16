

# Rename "Seal Bowl" → "Finalize Mix"

## Changes

Four files need label updates. The underlying database status value (`sealed`) stays the same — this is a UI-only rename.

### 1. `src/components/dashboard/backroom/LiveBowlCard.tsx` (line 250)
- `Seal Bowl` → `Finalize Mix`

### 2. `src/components/dashboard/backroom/BowlCard.tsx` (line 151)
- `Seal Bowl` → `Finalize Mix`

### 3. `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (line 806)
- `Seal Bowl` → `Finalize Mix`

### 4. `src/components/dashboard/backroom/MixSessionManager.tsx` (line 175)
- Toast: `'Failed to auto-seal bowls'` → `'Failed to auto-finalize bowls'`

No database or state machine changes — the `sealed` status key is an internal value and doesn't surface to users.

