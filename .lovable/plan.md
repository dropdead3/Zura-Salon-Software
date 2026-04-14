

# Improve Splash Screen Uploader Layout

## What Changes

The current layout has the dropzone and actions side-by-side in a cramped horizontal flex. The "Generate from Logo" button floats awkwardly next to a tall dropzone. The screenshot shows significant wasted space.

## Proposed Layout

Restructure the card content area into a cleaner, more balanced design:

1. **Location selector** stays at top, unchanged.

2. **Main content area** becomes a centered, vertically-stacked layout:
   - The dropzone/preview panel remains 9:16 aspect but is centered and slightly larger (200x356)
   - Below the preview: action buttons in a horizontal row (Generate from Logo | Upload to Reader | Clear/Remove)
   - Help text sits below the buttons as a muted footer

3. **When a preview exists**: the dropzone shows the image, and the action row below shows "Upload to Reader" (primary) + "Clear" (ghost) side by side

4. **When no preview + no active splash**: dropzone is empty with upload prompt, "Generate from Logo" button is below as a standalone outlined button

5. **When splash is active + no pending**: show the active indicator inside the dropzone area, with "Remove" button below

## File Changed

`src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — restructure the JSX in the `hasTerminalLocation` section (lines 304-425) from horizontal flex to centered vertical stack with button row beneath.

