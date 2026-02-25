

## Fix: Location Breakdown Section Styling Cohesion

The screenshot shows two location display patterns with inconsistent styling:

1. **"By Location"** (left card) -- uses `font-medium text-muted-foreground uppercase` with `font-sans` (Aeonik Pro). Per UI Canon, uppercase labels must use `font-display` (Termina).
2. **Location rows** use `bg-muted/20` instead of `bg-card-inner` (missed in the mass update).

### Changes

**File: `src/components/dashboard/LocationBreakdownSection.tsx`**

1. **Line 57**: Change the "By Location" label to use `font-display` (Termina) instead of default font-sans. This matches the "Location Scoreboard" header pattern.
   ```
   - <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
   + <span className="text-xs font-display text-muted-foreground tracking-wide">
   ```
   (`font-display` automatically applies uppercase + tracking, so we drop the redundant `uppercase` and `font-medium`.)

2. **Line 65**: Change location row backgrounds from `bg-muted/20` to `bg-card-inner` for consistency with the mass update.
   ```
   - className="flex items-center justify-between p-2 bg-muted/20 rounded-md border border-border/30"
   + className="flex items-center justify-between p-2 bg-card-inner rounded-md border border-border/30"
   ```

### Scope

2 class string changes in 1 file. No structural changes.

