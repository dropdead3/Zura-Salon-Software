

## Make "Add Bowl" / "Add Bottle" Buttons More Noticeable

### Change

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

Replace the current `border-dashed` outline buttons (lines 1507–1527) with a slightly more prominent style:

- Remove `border-dashed` — use a solid border instead
- Add `border-border/80` for a more visible border
- Add `bg-muted/40 hover:bg-muted/70` for a subtle fill that makes them stand out from the dark background
- Keep `text-xs`, `h-9`, `flex-1`, `variant="outline"`, and `size="sm"` unchanged

### Scope
- Single file, 2 className strings updated (one per button)
- No logic changes

