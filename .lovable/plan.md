

## Fix: Category Section Headers Must Use Termina (font-display)

### Problem
In `DashboardCustomizeMenu.tsx` line 692, category group headers ("EXECUTIVE", "SALES", "FORECASTING", etc.) use `uppercase tracking-wider` without `font-display`, rendering them in Aeonik Pro — a direct violation of the typography doctrine.

**Rule**: All uppercase text must use `font-display` (Termina). Aeonik Pro (`font-sans`) is never uppercase.

### Root Cause
The `uppercase` class was applied without the required `font-display` companion. This is a common slip when styling small labels — developers reach for `uppercase tracking-wider` as a visual shorthand without pairing it with the correct font family.

### Fix

**File: `src/components/dashboard/DashboardCustomizeMenu.tsx`** (line 692)

Change:
```tsx
<p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1 px-1">
```

To:
```tsx
<p className="text-[10px] font-display font-medium text-muted-foreground/70 uppercase tracking-wider mb-1 px-1">
```

Add `font-display` so these category headers render in Termina as required.

### Also check: "AVAILABLE ANALYTICS" header (line 674)

Same file, the main heading also uses uppercase without `font-display`:
```tsx
<h3 className="text-sm font-medium text-muted-foreground">AVAILABLE ANALYTICS</h3>
```

Fix: add `font-display tracking-wide` to match the card title token pattern.

### Scope
Two lines in one file. No other components affected.

