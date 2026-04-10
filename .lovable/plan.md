

# Fix: Section Header Color in Command Surface

## Problem

Section headers ("ACTIONS", "THIS EVENING", "RECENT", etc.) use `text-muted-foreground` via `tokens.heading.subsection`, which is the same color as the search option text. They blend together instead of standing out as structural labels.

## Fix

Update the `heading.subsection` token in `src/lib/design-tokens.ts` to use `text-muted-foreground/70` instead of `text-muted-foreground`. This gives them a slightly dimmer, more recessed appearance — making them read as structural labels rather than selectable items. The section headers become clearly distinct from the brighter row text.

**Before:**
```
subsection: 'font-display text-xs font-medium text-muted-foreground uppercase tracking-[0.15em]',
```

**After:**
```
subsection: 'font-display text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.15em]',
```

This makes headers feel like quiet structural markers while the actionable rows remain at full `text-foreground`/`text-muted-foreground` brightness.

| File | Change |
|------|--------|
| `src/lib/design-tokens.ts` | Dim subsection header color to `/60` opacity |

