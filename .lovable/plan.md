

## Invert Nested Card Depth: Darker Instead of Lighter

The current `--card-inner` values make subcards lighter than their parent. This plan flips that so nested cards are slightly darker, creating a "sunken" depth effect that better separates inner content from the parent card surface.

### What Changes

**File: `src/index.css`** -- Update all 8 `--card-inner` values (4 themes x light/dark):

| Theme | Mode | Current (lighter) | New (darker) |
|-------|------|--------------------|--------------|
| Cream | Light | `40 20% 95%` | `40 20% 93%` |
| Cream | Dark | `0 0% 15%` | `0 0% 8%` |
| Rose | Light | `350 20% 96%` | `350 15% 93%` |
| Rose | Dark | `350 10% 16%` | `350 5% 8%` |
| Sage | Light | `145 15% 95%` | `145 12% 93%` |
| Sage | Dark | `145 8% 16%` | `145 4% 8%` |
| Ocean | Light | `210 20% 96%` | `210 15% 93%` |
| Ocean | Dark | `210 10% 16%` | `210 5% 8%` |

In light mode, subcards drop ~5% lightness from the parent card (~98% → 93%), giving a subtle inset feel. In dark mode, subcards drop from 11% to 8% (close to background), creating a clear recessed appearance.

### Scope

8 single-line value changes in `src/index.css`. No other files need to change -- the `bg-card-inner` utility class and `tokens.card.inner` token already reference the variable, and `AggregateSalesCard.tsx` already uses them.

