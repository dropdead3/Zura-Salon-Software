

## Crop-to-Square & Optimize Product Image Uploads

### Problem
Product images are uploaded raw — no resizing, no compression, no aspect ratio enforcement. This leads to inconsistent display and slow loading.

### Changes

**`src/components/dashboard/settings/RetailProductsSettingsContent.tsx`** — `handleImageUpload` function (lines 231-246)

1. Import `optimizeImage` from `@/lib/image-utils` (already exists in the project)
2. Before uploading, run the file through `optimizeImage` with square crop settings:
   - `maxWidth: 800`, `maxHeight: 800`, `quality: 0.82`, `format: 'webp'`
3. Add square cropping logic to `optimizeImage` or do it inline: after loading the image, crop to a centered square (use the shorter dimension) before resizing
4. Upload the optimized `.webp` blob instead of the raw file
5. Change the upload path extension to `.webp`

**`src/lib/image-utils.ts`** — Add `cropToSquare` option

- Add optional `cropToSquare?: boolean` to `OptimizeOptions`
- When enabled, before scaling: calculate centered square crop from the shorter dimension, then `ctx.drawImage` with source crop parameters
- This keeps the utility reusable for other components

**UI adjustments in the dialog:**
- Change `aspect-video` to `aspect-square` on both the image preview container (line 277) and the upload placeholder (line 288) so the UI reflects the square output

### Summary
Two files changed. Images will be auto-cropped to center-square at max 800×800 WebP (~80KB typical), ensuring fast loading and consistent display.

