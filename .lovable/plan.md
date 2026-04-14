

# Fix Splash Screen Background — Solid Black + Corner Glows Only

## Problem
The 3-stop linear gradient in `terminal-splash-palettes.ts` has a lighter middle stop (e.g. `#2d2820` for cream theme) at position 0.4, creating a visible reflective band across the center of the screen.

## Fix

### 1. Replace linear gradient with solid black fill
In `SplashScreenUploader.tsx` (lines 170-175), replace the linear gradient with a flat `#000000` fill:
```
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, TARGET_W, TARGET_H);
```

### 2. Keep corner radial glows as-is
The two radial gradients at top-left and bottom-right (lines 177-189) remain unchanged — they use the accent color at 0.10 opacity which provides the subtle tan glow.

## File
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — lines 170-175 (replace 6 lines with 2)

