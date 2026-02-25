

## Improve Profile Photo Load Time

Good catch -- the photo is loading slowly because of two compounding issues in the current pipeline.

### Root Causes

1. **No cache headers on upload** -- `useUploadProfilePhoto` calls `supabase.storage.upload()` without a `cacheControl` option. Every time the browser encounters the photo URL, it re-fetches the full image from storage with no HTTP caching.

2. **JPEG at 0.9 quality, 800px output** -- The crop modal outputs `image/jpeg` at quality 0.9 with `maxOutputSize: 800`. This produces unnecessarily large files (~200-400KB). Switching to WebP at 0.82 quality would cut file size roughly in half with no visible quality loss.

3. **File extension mismatch** -- The upload hook defaults to `.jpg` for Blob inputs, but if we switch the crop output to WebP, the extension and content-type should match.

### Changes

**File: `src/hooks/useEmployeeProfile.ts`**

1. Add `cacheControl: '31536000'` (1 year) and `contentType: 'image/webp'` to the storage upload call. Since file names include a timestamp (`Date.now()`), each new upload gets a unique URL -- long cache is safe.
2. Change the fallback extension from `'jpg'` to `'webp'` for Blob inputs.

**File: `src/components/dashboard/ImageCropModal.tsx`**

3. Change the `toBlob` output format from `'image/jpeg', 0.9` to `'image/webp', 0.82`. WebP produces ~40-50% smaller files at equivalent visual quality.

**File: `src/hooks/useAdminProfile.ts`** (if it has the same pattern)

4. Mirror the same `cacheControl` and `contentType` improvements.

### What This Achieves

- **Instant repeat loads**: Browser caches the photo for 1 year (URL changes on re-upload anyway)
- **Faster first load**: ~40-50% smaller file size from WebP compression
- **No visual quality loss**: WebP 0.82 is perceptually equivalent to JPEG 0.9

### Files Changed
- `src/hooks/useEmployeeProfile.ts` -- cache headers + WebP content type
- `src/hooks/useAdminProfile.ts` -- same cache/content type fix
- `src/components/dashboard/ImageCropModal.tsx` -- WebP output format

