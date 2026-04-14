

# Add Splash Screen Upload to Zura Pay Display Tab

## What This Does
Lets operators upload a branded splash screen image (the idle/default screen) to their physical S710/S700 readers directly from the Display tab. Supports per-location overrides matching the multi-location architecture.

## How Stripe Splash Screens Work
- Upload a 1080x1920 JPG/PNG (< 2MB) or GIF (< 4MB) via the Configuration API
- Configurations can be account-default or per-location (location overrides account)
- Readers auto-update within ~10 minutes of a new configuration being applied

## Plan

### 1. Extend edge function with splash screen actions

**File: `supabase/functions/manage-stripe-terminals/index.ts`**

Add three new actions to the existing function:

- **`upload_splash_screen`**: Accepts a base64-encoded image + location_id. Creates a new Terminal Configuration with the splashscreen file via `POST /v1/terminal/configurations` (multipart/form-data), then assigns it to the terminal location via `configuration_overrides`. Validates image size (< 2MB for JPG/PNG, < 4MB for GIF) and dimensions server-side.

- **`get_splash_screen`**: Fetches the current configuration for a terminal location to check if a splash screen is set. Returns the current splash screen URL if available.

- **`remove_splash_screen`**: Creates a new configuration without a splash screen and assigns it, effectively clearing the custom splash.

The Stripe Configuration API requires `multipart/form-data` for the splashscreen file upload — the edge function will convert the base64 payload to a Blob and use FormData.

### 2. Add splash screen upload UI to Display tab

**File: `src/components/dashboard/settings/terminal/ZuraPayDisplayTab.tsx`**

Add a "Splash Screen" card below the existing simulator with:
- Image dropzone (drag-and-drop or click to upload) constrained to 1080x1920
- Canvas-based cropper/resizer that ensures the uploaded image meets the 1080x1920 requirement
- Per-location selector (dropdown of terminal locations) so multi-location orgs can set different splash screens per location
- "Upload to Reader" button that base64-encodes the image and calls the edge function
- Current splash screen preview (fetched from the configuration) with a "Remove" action
- Status indicator showing "Splash screen active" or "Using default" per location

### 3. Create hook for splash screen management

**New file: `src/hooks/useTerminalSplashScreen.ts`**

- `useTerminalSplashScreen(locationId)` — queries current configuration
- `useUploadSplashScreen()` — mutation to upload + assign
- `useRemoveSplashScreen()` — mutation to clear

### 4. Auto-generate splash screen from branding (stretch)

Add a "Generate from Logo" button that takes the org's `logo_dark_url`, places it centered on a 1080x1920 dark background with the business name below, and offers it as a one-click upload. This uses client-side canvas rendering — no external service needed.

## Files

| File | Action |
|------|--------|
| `supabase/functions/manage-stripe-terminals/index.ts` | Add `upload_splash_screen`, `get_splash_screen`, `remove_splash_screen` actions |
| `src/hooks/useTerminalSplashScreen.ts` | New — query + mutation hooks |
| `src/components/dashboard/settings/terminal/ZuraPayDisplayTab.tsx` | Add splash screen upload card with per-location support |
| `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` | New — dropzone, preview, crop, generate-from-logo UI |

## Technical Notes

- Stripe's `/v1/terminal/configurations` splash screen parameter requires `multipart/form-data` with a file field, not URL-encoded form params. The edge function will construct a `FormData` object with the image Blob.
- The cellular configuration created during `create_location` will be preserved — the new splash screen config will include `cellular[enabled]=true` to avoid overwriting it.
- Image validation happens both client-side (preview + dimension check) and server-side (size limit enforcement in the edge function).

