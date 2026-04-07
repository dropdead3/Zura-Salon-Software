

# Add Eval Window ≥ Level Tenure Validation

## Problem
Evaluation window and level tenure are configured independently. An admin could set tenure to 180 days but eval window to 90 days, meaning the system would only assess half the tenure period — potentially missing poor early performance or rewarding a short hot streak.

## Rule
`evaluation_window_days` must be ≥ `tenure_days` whenever both are configured. This applies to both promotion and retention evaluation windows.

## Changes

### 1. `src/components/dashboard/settings/GraduationWizard.tsx`
- Add client-side validation in the save handler: if `tenure_enabled && tenure_days > evaluation_window_days`, show an error toast and block save
- Add an inline warning below the Eval Window slider/input when the current value is less than tenure days (advisory text like "Eval window should be ≥ Level Tenure ({X}d) to ensure full-period assessment")
- Auto-correct: when tenure days is increased past eval window, bump eval window to match (with a toast noting the adjustment)

### 2. `src/components/dashboard/settings/StylistLevelsEditor.tsx`
- In the Criteria Comparison Table, add a visual warning indicator (amber text or icon) on the Eval Window cell if its value is less than the Level Tenure value for the same level

## Behavior
- **Soft guard in table**: amber highlight when eval < tenure
- **Hard guard in wizard**: blocks save with clear message
- **Auto-adjust**: raising tenure past eval window auto-bumps eval window

## Files Changed
| File | Change |
|---|---|
| `GraduationWizard.tsx` | Add validation on save + inline warning + auto-adjust logic |
| `StylistLevelsEditor.tsx` | Amber warning on eval window cells that are < tenure |

2 files, no database changes.

