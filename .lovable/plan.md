

# Duplicate Pair Card UI Refinements

## Changes

All changes are in **`src/components/dashboard/clients/DuplicatePairCard.tsx`**.

### 1. Both cards labeled "Flagged Duplicate"
Change line 248 from `label="Original Profile"` to `label="Flagged Duplicate"`. Neither profile is assumed to be the "original."

### 2. Both cards use neutral styling (no orange card backgrounds)
Remove the `isDuplicate` conditional on the card container (lines 88-90). Both columns get the same neutral `border-border bg-card/50` styling. The amber/orange background is removed entirely from the card level.

Also remove the amber color from the label text (lines 96-99) -- both labels use `text-muted-foreground`.

### 3. Only matching fields stay highlighted
The existing amber highlights on matching phone, email, and name text (lines 113-150) remain unchanged. These correctly highlight only the specific fields that caused the match.

## Summary of line changes

| Lines | What | Before | After |
|-------|------|--------|-------|
| 88-90 | Card container class | Conditional amber bg for `isDuplicate` | Always `border-border bg-card/50` |
| 96-99 | Label text color | Conditional amber for `isDuplicate` | Always `text-muted-foreground` |
| 248 | Right column label | `"Original Profile"` | `"Flagged Duplicate"` |

No other files are modified.
