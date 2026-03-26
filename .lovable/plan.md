

## Fix KPI Icon Styling — Monochrome Token Compliance

### Problem
2 of 4 KPI tiles on the Price Intelligence page use hardcoded colored icon boxes instead of the standard monochrome `tokens.card.iconBox` + `tokens.card.icon` tokens:

- **Below Target**: `bg-amber-100 dark:bg-amber-900/30` + `text-amber-600` — should be `tokens.card.iconBox` + `tokens.card.icon`
- **Revenue Impact**: `bg-emerald-100 dark:bg-emerald-900/30` + `text-emerald-600` — should be `tokens.card.iconBox` + `tokens.card.icon`

The other 2 tiles (Avg Margin Gap, Default Target) already correctly use `tokens.card.iconBox` and `tokens.card.icon`.

### Fix

**File: `src/pages/dashboard/admin/PriceRecommendations.tsx`**

Replace the two hardcoded icon containers:

1. **Below Target (line ~217-219):** Replace `<div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 ...">` with `<div className={tokens.card.iconBox}>` and `<AlertTriangle className={tokens.card.icon} />`

2. **Revenue Impact (line ~251-253):** Replace `<div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 ...">` with `<div className={tokens.card.iconBox}>` and `<DollarSign className={tokens.card.icon} />`

All 4 tiles will then render with the same monochrome `bg-muted` box and `text-primary` icon, matching every other KPI strip on the platform.

