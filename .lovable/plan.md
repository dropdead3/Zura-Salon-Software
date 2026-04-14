

## Problem

When the system theme changes, the splash screen generator already uses the correct palette — but the generated image isn't automatically pushed to readers. Users must manually navigate to the splash screen tab and click "Use Default Luxury Splash" again.

## Solution

After a system theme change (in both SettingsCategoryDetail and WebsiteSettingsContent), automatically regenerate the default luxury splash screen using the new theme palette and push it to all terminal locations that already have an active splash screen.

### Approach

Extract the splash generation logic from `SplashScreenUploader.tsx` into a reusable utility function, then call it from the theme change handlers.

### 1. Extract splash generation into a shared utility

**New file: `src/lib/generate-terminal-splash.ts`**

- Move the canvas-drawing logic (lines 197-313 of SplashScreenUploader) into a pure async function: `generateDefaultSplash(orgLogoUrl, businessName, colorTheme) → { base64, dataUrl }`
- Takes logo URL, business name, and `ColorTheme` as inputs
- Returns the base64 JPEG string ready for upload
- SplashScreenUploader's `handleGenerateFromLogo` refactored to call this utility

### 2. Create an auto-sync hook

**New file: `src/hooks/useAutoSyncTerminalSplash.ts`**

- Exposes `syncSplashToTheme(colorTheme)` function
- Logic:
  1. Resolve all terminal locations across all org locations (using `resolveAllTerminalLocations`)
  2. Filter to only locations that currently have an active splash screen (call `get_splash_screen` for each)
  3. Generate the new default splash using the utility from step 1
  4. Push to all active-splash locations via `usePushSplashToAllLocations`
  5. Show a toast: "Terminal splash screens updated to match {theme} theme"
- If no locations have active splash screens, silently skip (no error)

### 3. Wire into theme change handlers

**File: `src/components/dashboard/settings/SettingsCategoryDetail.tsx`** (line 593-600)

After `setColorTheme` + category theme sync, also call `syncSplashToTheme(themeOption.id)`.

**File: `src/components/dashboard/settings/WebsiteSettingsContent.tsx`** (line 494-498)

Same pattern after website theme activation sets the color theme.

### 4. Refactor SplashScreenUploader

**File: `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`**

Replace inline canvas logic in `handleGenerateFromLogo` with a call to the shared `generateDefaultSplash` utility.

### Files changed
- **New**: `src/lib/generate-terminal-splash.ts` (~80 lines)
- **New**: `src/hooks/useAutoSyncTerminalSplash.ts` (~50 lines)
- **Edit**: `src/components/dashboard/settings/SettingsCategoryDetail.tsx` (~5 lines)
- **Edit**: `src/components/dashboard/settings/WebsiteSettingsContent.tsx` (~5 lines)
- **Edit**: `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` (refactor to use shared utility)

### Behavior notes
- Only locations with **already-active** splash screens get updated — we don't push splash to locations that never had one
- The sync is fire-and-forget (async, non-blocking) so the theme change feels instant
- If the org has no logo URL, splash sync is silently skipped

