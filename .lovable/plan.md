## Why uploads are silently failing

The current uploader (`ImageUploadInput`, used by the Promotional Popup `Image (optional)` field) catches every error and shows a generic `Failed to upload image` toast. Looking at the code path, the realistic failure modes are:

1. **Unsupported source format** — HEIC/HEIF (default iPhone format) and AVIF can't be decoded by `<img>` in most browsers, so `optimizeImage` rejects with `Failed to load image` before any upload happens.
2. **Oversized source files** — A 40MP DSLR JPEG or a 50MB PNG can blow past the canvas memory ceiling on Safari/iOS, causing `canvas.toBlob` to return `null` ("Failed to create image blob").
3. **Animated GIFs** — Get silently flattened to a single WebP frame, which often surprises operators (not technically a failure, but reads as "broken").
4. **Storage upload errors** — Bucket exists, public, no MIME/size limit, RLS allows authenticated. So most failures are client-side (cases 1–3), not server-side. But when a real network/auth error does happen, the user sees the same generic toast — no actionable information.
5. **No visible guardrails** — The field has no recommended size, no max-MB shown, no aspect-ratio guidance. Operators upload phone screenshots (HEIC, 4–8MB) and get a mysterious failure.

The video uploader (`MediaUploadInput`) already has size limits and clearer messaging — we'll bring `ImageUploadInput` up to that bar and improve both.

## What we'll change

### 1. Pre-flight validation in `ImageUploadInput`

Before calling `optimizeImage`, validate:

- **MIME type** — Accept only `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Reject `image/heic`, `image/heif`, `image/avif` with an actionable toast: *"HEIC isn't supported — convert to JPG/PNG first (iPhone Settings → Camera → Formats → Most Compatible)."*
- **File size** — Hard cap at **10 MB** for source images. Warn at **5 MB**. Toast names the actual size and the cap.
- **Empty/zero-byte files** — Reject with clear message.

### 2. Better error surfacing

- Catch the specific failure stage (decode / canvas / upload) and surface it in the toast: *"Couldn't read this image — it may be corrupted or in an unsupported format"* vs *"Couldn't reach storage — check connection and try again."*
- Log the underlying error code from Supabase (`error.message`, `error.statusCode`) into the console with context so future debugging is faster.

### 3. Visible recommended-spec helper text

Add a one-line caption under the dropzone (always visible, not just on hover):

- **Recommended:** 1200×800px or larger, JPG/PNG/WebP, under 10 MB
- For video: MP4/WebM, 1080p, under 50 MB (already partially shown in `MediaUploadInput`, we'll polish wording)

This caption uses `tokens.body.helper` styling so it matches existing field hints.

### 4. Same guardrails in `MediaUploadInput` for the image branch

Currently `MediaUploadInput` only enforces size on videos. We'll mirror the image-side guard (10 MB cap, HEIC rejection, decode-stage error messaging) so both uploaders behave identically for image input.

### 5. Bucket-side hardening (defense in depth)

The `website-sections` bucket has no `file_size_limit` or `allowed_mime_types`. We'll add:

- `file_size_limit`: **52428800** (50 MB) — covers the largest legitimate video, blocks accidental uploads of huge files at the edge before they consume bandwidth.
- `allowed_mime_types`: `image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm`.

If a request slips past the client check, the storage API returns a clean error code we can map to a user-facing message.

## Files to touch

- `src/components/dashboard/website-editor/inputs/ImageUploadInput.tsx` — Add MIME + size pre-flight, stage-aware error handling, recommended-spec caption.
- `src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx` — Mirror the image-side guards, polish caption to show both image and video recommended specs.
- New migration — `ALTER` `storage.buckets` row for `website-sections` to set `file_size_limit` and `allowed_mime_types`.

No changes to RLS policies (already correct), no schema changes, no breaking changes to the calling editors.

## Out of scope

- HEIC → JPG client-side transcoding (would require a 200 KB+ wasm dep; better to ask operators to convert).
- Video transcoding/compression (operators bring their own optimized files, as documented in the existing `MediaUploadInput` header comment).
- Replacing `ImageUploadInput` with `MediaUploadInput` everywhere — out of scope for a debugging pass; promo popup intentionally takes images only.