

# Remove the glow under the God Mode bar

## Diagnosis

In `src/components/dashboard/GodModeBar.tsx`, the bar applies a `boxShadow` with the org's primary color spilling 12–20px below it:

- Dark (line 48): `0 4px 20px -4px hsl(var(--primary) / 0.35)` — that's the violet halo in your screenshot.
- Light (line 67): `0 2px 12px -4px hsl(var(--primary) / 0.25)`.

The bar already establishes itself via background gradient + bottom border. The drop shadow is redundant decoration.

## Fix — one file, two values

`src/components/dashboard/GodModeBar.tsx`:

- Set `boxShadow: 'none'` in both `chrome` branches (dark + light).
- Keep everything else (gradient background, border-bottom, backdrop blur) — those carry the system-chrome cue cleanly without the halo.

## What stays untouched

- Bar height, gradient, primary accent wash, blur.
- Border-bottom color (still demarcates the bar from content below).
- Exit button shadow (different element, intentional CTA elevation).
- All other components.

## Acceptance

1. No violet/primary glow bleeds below the God Mode bar in dark or light mode.
2. The bar still reads as a distinct system layer (gradient + border carry it).
3. Exit View button still has its own shadow.

