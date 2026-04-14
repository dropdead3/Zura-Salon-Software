

# Push Splash Screen to All Locations

## Summary
Add a "Push to All Locations" button that generates a branded splash screen once (using the existing `handleGenerateFromLogo` canvas logic) and uploads it to every location that has a mapped terminal location — in a single batch operation.

## Changes

### 1. New hook: `usePushSplashToAllLocations` in `src/hooks/useTerminalSplashScreen.ts`
- A mutation that accepts `{ imageBase64, imageMimeType }` plus an array of `{ locationId, terminalLocationId }` pairs
- Iterates through all location/terminal pairs, calling `invokeSplashAction('upload_splash_screen', ...)` for each
- Uses `Promise.allSettled` to handle partial failures gracefully
- Toasts a summary: "Pushed to 4/5 locations" or "Pushed to all 5 locations"
- Invalidates all `terminal-splash-screen` queries on completion

### 2. UI update in `SplashScreenUploader.tsx`
- When a splash preview is pending (`pendingFile` exists), show a secondary button: **"Push to All Locations"** beneath the existing "Upload to Reader" button
- This button is only visible when there are 2+ locations
- On click, it fetches terminal locations for every org location (via a helper), then calls the batch mutation
- Shows a loading state with progress indication (e.g. "Pushing 2/5...")
- The location selector remains for single-location uploads; "Push to All" is the batch shortcut

### 3. Helper: resolve all terminal location mappings
- A small async function that iterates `locations`, calls `invokeTerminalAction('list_locations', locId)` for each, and returns an array of `{ locationId, terminalLocationId }` pairs (filtering out locations with no terminal mapping)
- This runs on-demand when the user clicks "Push to All"

## Technical Detail
- Canvas generation happens once (client-side), producing a single base64 image
- The location name in the splash will use `businessName` (the org name), not per-location names — this is correct for a batch push since the logo + org branding is consistent
- Each upload is an independent edge function call; `Promise.allSettled` ensures one failure doesn't block others
- Locations without terminal mappings are silently skipped with a note in the toast summary

## Files
- **Edit**: `src/hooks/useTerminalSplashScreen.ts` — add batch push mutation
- **Edit**: `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — add "Push to All Locations" button and batch upload flow

