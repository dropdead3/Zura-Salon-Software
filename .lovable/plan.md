

# Make Table Edit Action Bar More Visible & Centered

## Problem
The floating action bar (with "Auto-step", "Save", and close buttons) that appears when editing a table row blends into the table cells. It's positioned `bottom-20 right-6`, making it easy to miss.

## Fix

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx` (~line 1248)

Reposition and restyle the floating bar:

1. **Center it horizontally** — change from `right-6` to `left-1/2 -translate-x-1/2` so it sits center-bottom of the viewport
2. **Lower it** — change `bottom-20` to `bottom-6` so it's clearly at the screen bottom
3. **Increase visibility** — use a solid, higher-contrast background (`bg-card`) with a stronger shadow and a subtle top border accent (primary color glow or brighter border)
4. **Increase size** — bump padding and text sizes slightly so buttons are more tappable and the bar reads as a prominent floating toolbar rather than a small pill

**Before:**
```
className="fixed bottom-20 right-6 z-50 flex items-center gap-2 bg-card/90 backdrop-blur-xl border border-border rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4)] px-4 py-2.5"
```

**After:**
```
className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 bg-card border border-border/60 rounded-xl shadow-[0_12px_48px_-8px_rgba(0,0,0,0.5)] px-5 py-3 ring-1 ring-primary/20"
```

Also bump the label and button text from `text-xs` to `text-sm` for better readability, and make the Save button slightly larger with more padding.

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Reposition floating action bar to center-bottom, increase contrast and size |

1 file, no database changes.

