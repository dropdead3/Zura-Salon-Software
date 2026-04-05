

# Levels Quick-Start Wizard

## Overview

A dismissable setup wizard that appears when a salon has **zero levels configured**. It asks three simple questions, then generates all levels with names, commission rates, and (optionally) Zura Recommended KPI criteria in one click.

## User Flow

```text
┌──────────────────────────────────────────────┐
│  🪄  Quick Setup                    [Dismiss] │
│                                               │
│  Step 1: How many levels?                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐              │
│  │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │  ← pill btns │
│  └───┘ └───┘ └───┘ └───┘ └───┘   (4 default) │
│                                               │
│  Step 2: Commission range                     │
│  Base (lowest level):  [30]%  ← suggestion 30 │
│  Top (highest level):  [50]%  ← suggestion 50 │
│  Retail (all levels):  [10]%  ← suggestion 10 │
│                                               │
│  ☑ Also apply Zura Recommended KPI criteria   │
│                                               │
│  [Generate Levels]                            │
└──────────────────────────────────────────────┘
```

**After clicking "Generate Levels":**
- Creates N levels with industry-standard names (New Talent, Emerging, Stylist, Senior Stylist, Master Stylist, Director, Elite)
- Interpolates service commission linearly from base → top
- Sets retail commission uniformly
- Saves levels to DB via existing `useSaveStylistLevels`
- If KPI checkbox is checked, also saves promotion + retention criteria for each level using existing `getZuraDefaults` / `getZuraRetentionDefaults`
- Wizard dismisses and the Levels tab shows the freshly created levels

**Dismissal**: An "X" button sets a local state flag. The wizard only shows when `levels.length === 0 && !dismissed`. No persistence needed — if they navigate away and come back with zero levels, it reappears (which is helpful).

## Level Name Templates

| Count | Names |
|-------|-------|
| 3 | New Talent, Stylist, Senior Stylist |
| 4 | New Talent, Emerging, Stylist, Senior Stylist |
| 5 | New Talent, Emerging, Stylist, Senior Stylist, Master Stylist |
| 6 | New Talent, Emerging, Stylist, Senior Stylist, Master Stylist, Director |
| 7 | New Talent, Emerging, Stylist, Senior Stylist, Master Stylist, Director, Elite |

## Commission Interpolation

```text
rate(i) = baseRate + (topRate - baseRate) * (i / (count - 1))
// Rounded to nearest integer
// Level 0 = baseRate, Level N-1 = topRate
```

## Technical Details

**Files changed: 1**

**`StylistLevelsEditor.tsx`** — Add a `LevelsQuickSetupWizard` component rendered conditionally when `levels.length === 0 && !wizardDismissed`:

1. Add state: `wizardDismissed` (boolean), `wizardLevelCount` (number, default 4), `wizardBaseRate` (string, default "30"), `wizardTopRate` (string, default "50"), `wizardRetailRate` (string, default "10"), `wizardApplyKPIs` (boolean, default true)
2. Add `LEVEL_NAME_TEMPLATES` constant mapping count → name arrays
3. Add `handleQuickSetup()` function that:
   - Builds `LocalStylistLevel[]` from template names + interpolated rates
   - Calls `handleSave` equivalent (sets levels, triggers save)
   - If KPI checkbox is on, saves promotion + retention criteria for each level via existing hooks
4. Render the wizard card above the levels list in the "Levels" tab content area, replacing the empty state
5. Uses existing design tokens, pill-style number selector, Input fields for commission

**No new files. No database changes. No new hooks.**

