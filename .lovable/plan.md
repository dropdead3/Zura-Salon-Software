

# Adjust Splash Screen Layout & Styling

## Changes in `SplashScreenUploader.tsx`

### 1. Enlarge logo
- Line 188: `maxLogo` from `440` → `520`

### 2. Shrink location name
- Line 204: font size from `36px` → `24px`
- Line 206: letter-spacing from `8px` → `5px`

### 3. Increase padding between logo and location name
- Line 193: `groupGap` from `50` → `70`

### 4. Match location name color to "Powered by Zura" color
- Line 203: change `ctx.fillStyle = p.textColor` → `ctx.fillStyle = p.mutedColor`

### 5. Adjust text block height for smaller font
- Line 192: `textBlockHeight` from `40` → `28`

## File
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — parameter tweaks on lines 188, 192-193, 203-204, 206

