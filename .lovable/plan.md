

# Earnings Structure Selector for Stylist Levels

## Current State

The level editor shows Service Commission %, Retail Commission %, and an Hourly Wage toggle+input all at once. The user must mentally figure out which fields matter. The hourly wage toggle is separate from commission, but there's no clear "pay type" concept.

## Proposed Design

Replace the current flat layout with an **Earnings Structure** selector that drives which inputs appear:

```text
┌─────────────────────────────────────────────┐
│  Earnings Structure                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ Hourly   │ │Commission│ │ Hourly +     ││
│  │ Only     │ │ Only     │ │ Commission   ││
│  └──────────┘ └──────────┘ └──────────────┘│
│                                             │
│  [Conditional inputs based on selection]    │
└─────────────────────────────────────────────┘
```

**Selection → Visible Inputs:**

| Selection | Hourly Wage | Service Commission % | Retail Commission % |
|-----------|-------------|---------------------|---------------------|
| Hourly Only | Yes | Hidden | Hidden |
| Commission Only | Hidden | Yes | Yes |
| Hourly + Commission | Yes | Yes | Yes |

## Enhancements

1. **Visual segmented toggle** — Use a `ToggleGroup` (single-select) with three options styled as pills, rather than separate switches
2. **Contextual helper text** — Show a one-line description below the selector explaining the pay model (e.g., "Base hourly rate with no commission on services or retail" for Hourly Only)
3. **Smart defaults** — When switching to "Hourly Only," auto-clear commission fields; when switching to "Commission Only," auto-clear hourly wage
4. **Backwards compatible** — Derive the initial selection from existing data: if `hourlyWageEnabled && commissionRate > 0` → "Hourly + Commission", if `hourlyWageEnabled && no commission` → "Hourly Only", otherwise → "Commission Only"

## Technical Plan

### A. Update `LocalStylistLevel` interface (1 file)

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

- Add `earningsStructure: 'hourly' | 'commission' | 'both'` to the local state interface
- Derive initial value in the `useEffect` that maps `dbLevels` → `LocalStylistLevel[]`
- On save, map back: `hourlyWageEnabled = structure !== 'commission'`, clear commission rates if `hourly`, clear hourly wage if `commission`

### B. Replace commission + hourly UI block (same file)

- Remove the current flat "Service Commission % / Retail Commission %" grid and the separate "Hourly Wage" toggle+input
- Add a labeled `ToggleGroup` with three options: Hourly, Commission, Both
- Conditionally render the hourly wage input and/or commission inputs based on selection
- Keep inputs mounted but height-collapsed per UI interaction standards (prevents layout shift issues with Radix)

### C. No database changes

The underlying `stylist_levels` table already has `hourly_wage_enabled`, `hourly_wage`, `service_commission_rate`, and `retail_commission_rate`. The earnings structure is purely a UI concept derived from these fields.

## Summary
- **1 file modified** (`StylistLevelsEditor.tsx`)
- No database changes
- Cleaner UX that makes pay model explicit rather than implicit

