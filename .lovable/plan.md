

# Fix: Final Level Cannot Set Level Requirements

## Problem

The Graduation Wizard explicitly disables the "Level Requirements" tab for the final (highest) level, treating it identically to Level 1 (the base/entry level). This is incorrect — while Level 1 has no promotion criteria because it's the starting point, the **final level absolutely needs promotion criteria** because stylists must earn their way to the top.

The bug appears in three places in `GraduationWizard.tsx`:

1. **Line 501** — Default tab selection forces `retention` for the last level
2. **Line 701** — Tab button is `disabled` for the last level
3. **Line 707** — Tab styling applies `opacity-50 pointer-events-none` for the last level

Additionally, in `StylistLevelsEditor.tsx` **line 1723-1724**, the "Zura Defaults" seeding skips generating promotion criteria for the last level.

## Fix

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

Remove `levelIndex === totalLevels - 1` from all three locations:

- **Line 501**: Change condition to `levelIndex === 0` only
- **Line 701**: Change `disabled` to `levelIndex === 0` only
- **Line 707**: Change opacity condition to `levelIndex === 0` only

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

- **Line 1724**: Remove the `if (levelIndex < savedLevels.length - 1)` guard so the last level also gets default promotion criteria seeded.

## Scope
- 2 files modified
- ~4 lines changed (condition removals)
- No database changes

