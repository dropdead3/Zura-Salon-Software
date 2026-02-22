

# Scrollbar Audit -- Fixes Required

## Issues Found

### 1. Duplicate `transition` declarations in CSS (Bug)

Three locations in `src/index.css` have **two consecutive `transition` lines** where the second (`0.2s`) silently overrides the first (`0.3s`). This means the `0.3s ease` transition we added is never actually applied.

| Lines | Section |
|-------|---------|
| 931-932 | `.scrollbar-minimal::-webkit-scrollbar-thumb` |
| 973-974 | `.scrollbar-thin::-webkit-scrollbar-thumb` |
| 1395-1396 | Global `::-webkit-scrollbar-thumb` |

**Fix:** Remove the old `transition: background 0.2s ease` line from each, keeping only `transition: background 0.3s ease`.

### 2. No other structural issues

- The Radix `ScrollArea` component correctly uses tokenized classes (`tokens.scrollbar.*`) with `forceMount` for the opacity animation.
- Native CSS scrollbar rules (global, `.scrollbar-thin`, `.scrollbar-minimal`) all use the correct token-aligned colors (`--muted-foreground` at 0.25 / 0.4 / 0.5 opacity).
- ~153 files use native `overflow-auto` / `overflow-y-auto` -- these are covered by the global CSS scrollbar rules and do not need migration to `ScrollArea`.

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Remove 3 duplicate `transition: background 0.2s ease` lines (lines 932, 974, 1396) |

## Technical Detail

CSS does not merge duplicate properties -- the last one wins. So:
```css
transition: background 0.3s ease;  /* ignored */
transition: background 0.2s ease;  /* this wins */
```
Removing the `0.2s` line restores the intended `0.3s` timing across all native scrollbars.

