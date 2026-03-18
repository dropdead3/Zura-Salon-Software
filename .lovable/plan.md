

## Fix: Improve Table Visibility in Dark Mode

### Problem
The previous border refinement lowered `--border` to 20% lightness across all dark themes. This works for outer card borders but makes table row dividers (`border-border/50` in `TableRow`) nearly invisible inside cards.

### Solution

Raise `--border` lightness back to a moderate level that provides subtle-but-visible table lines without being harsh. Target: ~28-30% lightness (midpoint between the original 44% and the current 20%).

### Changes

**File: `src/index.css`** — Adjust `--border` and `--sidebar-border` in all 4 dark themes:

| Theme | Current | New |
|-------|---------|-----|
| Cream dark | `0 0% 20%` | `0 0% 28%` |
| Rose dark | `350 8% 22%` | `350 8% 28%` |
| Sage dark | `145 6% 22%` | `145 6% 28%` |
| Ocean dark | `210 8% 22%` | `210 8% 28%` |

Same adjustment for `--sidebar-border` values.

This restores table row visibility while keeping borders softer than the original 44%.

### Files
- `src/index.css` — raise `--border` and `--sidebar-border` lightness from ~20% to ~28% in all dark themes

