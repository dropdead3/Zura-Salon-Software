

# Enhance Splash Screen Design — Round 2

## Current Issues (from screenshot)
- Background glows are barely visible — nearly flat black
- Logo sits quite high, leaving too much dead space below
- "NORTH MESA" location text is good but could have better hierarchy
- The divider line and footer rule are nearly invisible
- Zura Z icon dots feel small relative to the 1080px canvas
- Overall composition lacks the dimensional, "lit from within" quality

## Improvements

### 1. Stronger, Warmer Background Lighting
- Increase main radial glow opacity from 0.14 → 0.22 and secondary stop from 0.05 → 0.10 for a visible warm bloom behind the logo area
- Increase top vignette glow from 0.06 → 0.10
- Add a fourth glow — a wide, very subtle horizontal band across the center (0.08 opacity, elliptical) to create a "stage lighting" feel
- Bottom footer glow from 0.05 → 0.08

### 2. Logo Positioning & Sizing
- Move logo center from `TARGET_H * 0.35` to `TARGET_H * 0.33` — slightly higher to create better visual balance with the text below
- Reduce max logo size from 420 → 380 for more breathing room on smaller logos

### 3. Typography Refinement
- Business name: increase font size from 48px → 52px and letter-spacing from 6px → 8px for more commanding presence
- Add the location name (if available from the `locations` data) below the business name in a lighter weight (300, 32px) with 4px tracking
- Increase gap between business name and divider

### 4. Divider & Rules — More Visible
- Main accent divider: increase opacity from 0.4 → 0.55, width from 160px → 200px, line width from 2 → 2.5
- Footer horizontal rule: increase opacity from 0.12 → 0.20

### 5. Zura Footer — Bolder Presence
- Increase Z icon size from 72 → 84px
- Increase Z icon dot opacity from 0.6 → 0.7
- "Powered by Zura" font size from 26px → 28px

### 6. Noise Texture Adjustment
- Reduce noise intensity from 12 → 8 — current level may be introducing visible grain on some screens

### 7. Location Name Integration
- Pass selected location name into the generator
- Render it below the business name as a secondary line: lighter weight, slightly smaller, with more subtle opacity (0.7)

## Files Changed
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — adjust canvas drawing parameters (lines 164-280), pass location name to generator

## Technical Notes
- All changes are parameter tweaks in existing Canvas 2D code — no new dependencies
- Location name comes from the already-available `locations` array matched by `selectedLocationId`
- No structural changes to the rendering pipeline

