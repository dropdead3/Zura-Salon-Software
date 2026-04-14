

## Problem

The "Use Default Luxury Splash" button remains clickable even when the default splash is already active, making it unclear whether the default is currently applied.

## Solution

Track whether the current splash was generated from the default luxury template. When it is, disable the button and change its label to "Currently using Default Luxury Splash" with a check icon.

### Approach

Since Stripe doesn't distinguish between default and custom splash images, we'll track this with a simple `isDefaultSplash` state variable in the component:

- Set `true` after successfully uploading a generated default splash (in `handleUpload`'s `onSuccess` when the pending file came from `handleGenerateFromLogo`)
- Set `true` when auto-registration splash applies
- Set `false` when a custom file is uploaded or splash is removed
- Initialize based on whether the splash is active and was likely default (we can add a `generatedFromDefault` flag to `pendingFile` state)

### Changes

**File: `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`**

1. Add a `wasGeneratedDefault` boolean to track if the pending file came from the logo generator
2. Add `isDefaultLuxury` state — set `true` on successful upload of a generated splash, `false` on custom upload or removal
3. Update the button (lines 369-384):
   - When `hasSplash && isDefaultLuxury && !pendingFile`: show disabled button with `CheckCircle2` icon and text "Currently using Default Luxury Splash"
   - Otherwise: show the existing clickable button

### Files changed
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — Add default-splash tracking state + conditional button rendering

