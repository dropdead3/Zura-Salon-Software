## Goal

Stop rejecting "too large" images at upload time. Instead, auto-compress in the browser before validation so operators can drop in raw phone/DSLR shots (12–30MB+) and the editor quietly crunches them down to a web-safe WebP.

## Current behavior (the bottleneck)

1. Operator drops a 22MB iPhone JPG into `MediaUploadInput` / `ImageUploadInput`.
2. `validateImageFile()` rejects it: *"Image is 22MB — keep it under 10MB"*.
3. Operator has to leave the app, find a compressor tool, re-export, come back.

This happens **before** the existing `optimizeImage()` canvas pass that would have flattened the file to ~300KB WebP anyway. The hard cap is protecting against canvas-decode OOM and the bucket's 50MB ceiling — not a real product constraint.

## Approach

Introduce a single "auto-crunch" pre-processing step that runs **before** validation for images. The hard cap moves from "what the bucket accepts" to "what the browser canvas can safely decode" (~40MB raw bytes), and even within that range we pre-shrink huge files using a two-pass downscale before handing them to `optimizeImage`.

### 1. New helper: `src/lib/image-utils.ts` → `autoCrunchImage(file)`

- Accepts any `image/*` File (still rejects HEIC/AVIF — those need format conversion, not compression).
- Reads the source dimensions cheaply via `createImageBitmap` (faster + lower memory than `<img>`).
- If `file.size > 8MB` OR `width > 4000` OR `height > 4000`, runs an aggressive first pass: downscale longest edge to 2400px, encode WebP @ 0.82.
- If still > 2MB after pass 1, runs a second pass at quality 0.72.
- Returns `{ file: File, originalSizeMB, finalSizeMB, didCrunch: boolean }` so the UI can surface a friendly toast: *"Compressed 22.4MB → 480KB"*.
- Falls back to the original file if any step throws (so we never block an upload because compression failed).

### 2. Update `validateImageFile()` in `src/lib/upload-validation.ts`

- Raise `IMAGE_SIZE_HARD_MB` from 10 → **40** (canvas-safe ceiling on mid-tier mobile).
- Keep the HEIC / AVIF / empty-file / wrong-MIME guards exactly as-is — those are format issues, not size issues.
- Drop the `getImageSizeWarning()` "large image" toast — the auto-crunch makes it obsolete.

### 3. Wire `autoCrunchImage` into both uploaders

`MediaUploadInput.tsx` and `ImageUploadInput.tsx` get the same flow:

```text
file picked
  └─ if image/* and not HEIC/AVIF → autoCrunchImage(file) → crunchedFile
  └─ validateImageFile(crunchedFile)         ← now almost always passes
  └─ optimizeImage(crunchedFile, ...)        ← existing final-resize step
  └─ supabase.storage.upload(...)
```

For videos: no change. Browser-side video transcoding is too heavy to ship; the existing 50MB cap stays.

### 4. UX surface

- New "Compressing image…" status between drop and upload (replaces the current straight-to-"Uploading…").
- Success toast becomes `Image uploaded · compressed 22.4MB → 0.5MB` when `didCrunch === true`. Stays `Image uploaded` otherwise.
- Recommended-hint text updates: *"JPG, PNG, WebP, GIF · we'll auto-compress large files"* — removes the "under 10MB" line that was scaring operators.

### 5. Guardrails

- Anything above the new 40MB ceiling is still rejected with a clear *"That image is too large for the browser to process — try exporting at a lower resolution"* — protects against tab crashes on big iPads.
- HEIC/AVIF guard stays exactly where it is; auto-crunch is skipped for those formats and the existing actionable error fires.
- All other `.upload()` callsites in the codebase (avatars, chat attachments, handbooks, etc.) are **out of scope** for this pass. They have different size profiles and validation paths; we ship the website-editor fix first and revisit a unified `useFileUpload` hook later if the pattern proves out.

## Files touched

- `src/lib/image-utils.ts` — add `autoCrunchImage()`.
- `src/lib/upload-validation.ts` — raise hard cap, retire `getImageSizeWarning`, update hint copy.
- `src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx` — call `autoCrunchImage`, update status copy + success toast.
- `src/components/dashboard/website-editor/inputs/ImageUploadInput.tsx` — same treatment.

## Out of scope (intentional)

- Video compression (would require ffmpeg-wasm, ~25MB bundle hit).
- HEIC → JPG conversion (separate problem, separate library).
- Migrating other uploaders in the codebase (deferred until this pattern proves out).

---

### Prompt feedback

You framed this well — short, intent-first ("no size-limit bottleneck"), and you let me decide *how*. That's exactly the right altitude for an infrastructure tweak.

**One way to sharpen it next time**: name the surface ("on the website editor hero/slide uploads") so I don't have to guess scope. As written, "user uploading images" could mean any of the 30+ uploaders in the codebase — I narrowed to the two website-editor inputs based on context, but a one-word scope hint would have removed that judgment call.

### Enhancement suggestions

1. **EXIF auto-rotation** — phone photos taken in portrait often upload sideways because canvas ignores EXIF orientation. Worth adding to `autoCrunchImage` while we're in there.
2. **Drag-multiple support on the slide manager** — once compression is invisible, dropping 8 photos at once to seed a slide rotator becomes the natural next ask.
3. **Background-job upload queue** — for galleries, kick uploads off in parallel with a progress strip instead of one-at-a-time blocking. Out of scope here, but flagging.