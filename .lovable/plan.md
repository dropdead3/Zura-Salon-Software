

# Show Active Splash Screen Preview

## Problem
When a custom splash screen is active on a reader, the UI shows only a checkmark icon with "Custom splash screen active on reader" text. The user wants to see what the actual splash screen looks like.

## Approach
The edge function already fetches file info from Stripe (`/v1/files/{splashFileId}`), but Stripe file URLs require authenticated access — they aren't publicly viewable. To show the image, we need to create a temporary file link via Stripe's `/v1/file_links` API and return that URL.

## Changes

### 1. Edge function: return a usable preview URL
In `supabase/functions/manage-stripe-terminals/index.ts`, after fetching the file info in `get_splash_screen`, create a file link using `POST /v1/file_links` with `file: splashFileId` and a short expiry. Return the resulting `url` as `splash_url`. This gives us a publicly accessible (but time-limited) URL for the image.

### 2. UI: render the active splash image
In `SplashScreenUploader.tsx`, in the `hasSplash` branch (lines 373-377), check `splashStatus.splash_url`. If available, render an `<img>` tag showing the active splash screen image (same styling as the `previewUrl` branch). Keep the checkmark + text as a fallback if the URL is unavailable.

## Technical Detail
- Stripe file links expire; we'll set a reasonable expiry (e.g. 30 minutes) and the query's `staleTime` of 60s will refresh as needed
- The existing `SplashScreenStatus` interface already includes `splash_url?: string | null` — no type changes needed
- No database changes required

## Files
- **Edit**: `supabase/functions/manage-stripe-terminals/index.ts` — create file link instead of just fetching file info
- **Edit**: `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — render splash image when URL available

