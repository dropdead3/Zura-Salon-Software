

# Improve Splash Screen Design

## Current State
The generated splash has a simple linear gradient, a single radial glow, the org logo centered, business name in Termina, a thin divider line, and the Zura Z icon with "Powered by Zura" at the bottom. It works but feels flat and basic.

## Improvements

### 1. Richer Background Depth
- Add a **secondary radial glow** at the top of the canvas (subtle, wide) to create a vignette/atmosphere effect
- Add a **third glow** at the bottom near the Zura branding, very faint, to lift the footer area
- Shift the main gradient to be slightly off-center (40% midpoint instead of 50%) for more visual interest

### 2. Subtle Noise/Grain Texture
- Overlay a procedural noise pattern at very low opacity (3-5%) across the entire canvas to add tactile depth and prevent banding — generated pixel-by-pixel using `getImageData`/`putImageData`

### 3. Logo Presentation
- Add a **soft glow/halo** behind the logo using a tight radial gradient before drawing the logo itself
- Slightly reduce max logo size from 500 to 420 to give more breathing room
- Position logo slightly higher (offset from center by ~120px instead of 80px)

### 4. Typography & Layout
- Add **location name** below the business name in a lighter weight, smaller size (if available from context, otherwise skip)
- Increase letter-spacing on business name from 4px to 6px for more premium feel
- Make the accent divider line slightly wider (160px instead of 120px) and use rounded caps

### 5. Zura Footer Enhancement
- Increase Z icon size from 60px to 72px for better visibility
- Add a subtle horizontal rule above the Zura section (very low opacity)
- Slightly increase "Powered by Zura" font size from 24px to 26px with wider letter-spacing (3px)

### 6. Palette Enhancement
- Add a warm highlight stop at 20% opacity near the center to create a more dimensional, "lit from within" feel
- Increase the main radial glow radius from 400 to 500 for a broader, softer bloom

## File Changed
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — rewrite the canvas drawing section in `handleGenerateFromLogo` (lines 164-237)

## Technical Notes
- All changes are in the Canvas 2D rendering code — no new dependencies
- Noise texture uses `ctx.getImageData`/`putImageData` with random alpha values
- Rounded line caps via `ctx.lineCap = 'round'` for the divider

