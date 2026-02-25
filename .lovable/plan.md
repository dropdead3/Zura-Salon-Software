

## Fix: New Bookings Card Design Rule Violations

The screenshot reveals several styling inconsistencies compared to the canonical card UI standards:

### Issues Found

1. **Icon colors**: `UserPlus` uses `text-emerald-600`, `RefreshCw` uses `text-purple-600`, `CalendarCheck` uses conditional emerald/amber/red. Per UI Canon, icons inside card content tiles should use `text-primary` for consistency with other cards.
2. **"By Location" label** (line 199): Uses `font-medium text-muted-foreground uppercase tracking-wide` (font-sans). Must use `font-display` (Termina) per the fix we just applied to `LocationBreakdownSection`.
3. **Location rows** (line 207): Use `bg-muted/20` instead of `bg-card-inner` -- same issue we just fixed elsewhere.

### Changes

**File: `src/components/dashboard/NewBookingsCard.tsx`**

1. **Line 122**: Change `UserPlus` icon from `text-emerald-600` to `text-primary`
2. **Line 142**: Change `RefreshCw` icon from `text-purple-600` to `text-primary`
3. **Lines 159-163**: Change `CalendarCheck` icon from conditional emerald/amber/red to `text-primary` (the rebook health signal is already conveyed by the progress bar color)
4. **Line 199**: Change "By Location" label from `text-xs font-medium text-muted-foreground uppercase tracking-wide` to `text-xs font-display text-muted-foreground tracking-wide`
5. **Line 207**: Change location row background from `bg-muted/20` to `bg-card-inner`

### Scope

5 class string changes in 1 file. No structural or logic changes.

