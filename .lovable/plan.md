

# Enable Retention Criteria for Level 1 (Entry Level)

## Problem

Level 1 (Entry Level) currently shows "Entry level — no promotion criteria needed" and blocks all criteria configuration. While it's correct that Level 1 doesn't need **promotion** criteria (there's no level below to promote from), it absolutely needs **retention** criteria — minimum performance standards to remain employed.

## Changes

### 1. Level card criteria section (lines 799-802)
Replace the blanket "no criteria needed" message for `index === 0` with a split behavior:
- **Promotion**: Still show "Entry level — no promotion criteria" (correct)
- **Retention**: Show the existing criteria CTA or summary, allowing the admin to configure "Required to Stay" metrics via the GraduationWizard

### 2. Criteria Comparison Table (lines 207-215, 252-260)
Stop rendering `—` dashes for Level 1 in the **retention** section rows. Level 1 should show retention values (or "Configure" button) just like other levels. Promotion rows remain `—` for Level 1.

### 3. GraduationWizard — default to retention tab for Level 1
When opened for `levelIndex === 0`, auto-select the "retention" tab and hide or disable the "promotion" tab since it's not applicable.

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Update Level 1 criteria section to allow retention config; update comparison table to show retention data for Level 1 |
| `src/components/dashboard/settings/GraduationWizard.tsx` | **Modify** — Accept `levelIndex` to conditionally hide promotion tab when `levelIndex === 0`; default to retention tab for Level 1 |

**0 new files, 2 modified files, 0 migrations.**

