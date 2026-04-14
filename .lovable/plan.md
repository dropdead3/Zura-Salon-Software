

# Simplify Splash Screen Design

## Changes to `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`

### Remove
1. **Redundant location title** — remove the duplicate location name text (lines 246-253)
2. **Both divider lines** — remove the accent divider (lines 255-262) and the horizontal rule above Zura (lines 264-270)
3. **Grain/noise overlay** — remove the entire `getImageData`/`putImageData` noise loop (lines 209-218)
4. **All existing glow layers** — remove top glow, main bloom, stage lighting, bottom glow, and logo halo (lines 177-226)

### Add
1. **Two corner radial glows** — a glow anchored in the bottom-right corner and another in the top-left corner, using the accent color at ~0.18 opacity, fading to transparent
2. **True center-center layout** — calculate the vertical center of the canvas and position logo + business name as a centered group (logo above, business name below, balanced around `TARGET_H / 2`)

### Keep
- Linear gradient base background
- Logo drawing (380px max)
- Business name in Termina
- Zura Z icon + "Powered by Zura" footer

## Technical Detail
- Logo and business name group centered at `TARGET_H * 0.45` (slightly above true center to account for footer weight)
- Corner glows use large radii (~700px) anchored at `(0, 0)` and `(TARGET_W, TARGET_H)` for natural diagonal lighting

