

# Enable Promotion Criteria for Level 1

## Problem

Level 1 promotion criteria is incorrectly disabled everywhere. The logic treated "entry level" as "no promotion needed," but that's wrong — Level 1 stylists need promotion criteria to know how to reach Level 2. The only level that truly has no promotion criteria is the **last** level (nowhere to promote to).

## Changes

### 1. GraduationWizard.tsx
- Remove `disabled={levelIndex === 0}` from the promotion tab trigger
- Add `disabled={levelIndex === levels.length - 1}` instead (disable promotion for the **last** level — needs `totalLevels` prop)
- Default to retention tab only for the last level, not Level 1

### 2. StylistLevelsEditor.tsx — Level card (lines 797-844)
- Remove the `index === 0` special branch that only shows retention
- Level 1 now uses the same criteria display as all other levels (showing both promotion + retention summaries)

### 3. StylistLevelsEditor.tsx — Comparison table (lines 207-214)
- Remove `levelIdx === 0` override that forces `—` dashes in promotion rows
- Level 1 promotion cells now show values or "Configure" like any other level

### 4. GraduationWizard — pass total levels count
- Add `totalLevels` prop to GraduationWizard
- Pass `levels.length` from the editor when opening the wizard

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Remove Level 1 special-casing in card and comparison table; pass `totalLevels` to wizard |
| `src/components/dashboard/settings/GraduationWizard.tsx` | **Modify** — Accept `totalLevels` prop; disable promotion tab for last level instead of first |

**0 new files, 2 modified files, 0 migrations.**

