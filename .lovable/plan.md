## Goal

Finish the four mechanical wiring tasks deferred from the prior turn so operators get visible upload feedback, AI focal detection runs against a bounded image, and the public srcSet is capped to the actual master width.

## Changes

### 1. Persist `meta` on upload + pass it back into `MediaUploadInput`

**`src/components/dashboard/website-editor/HeroSlidesManager.tsx`** (`SlideRow` MediaUploadInput at lines 185–203)
- Extend the `onChange` handler to read `meta` from the payload and persist `media_width`, `media_height`, `media_size_bytes`, `media_format` into the slide patch alongside `background_url`.
- Add `meta={slide.media_width ? { width: slide.media_width, height: slide.media_height, sizeBytes: slide.media_size_bytes, format: slide.media_format } : null}` to the `<MediaUploadInput>` props.

**`src/components/dashboard/website-editor/HeroBackgroundEditor.tsx`** (lines 83–99)
- Same treatment on the section-level `MediaUploadInput`: persist `meta.*` into `config.media_*` via `onChange`, and pass the existing `config.media_*` back as `meta`.

### 2. Render the resolution caption strip on the preview tile

**`src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx`** (preview block at lines 345–372)
- When `meta?.width` is present and `kind === 'image'`, render a small caption strip absolutely positioned at the bottom-left of the preview tile (mirroring the existing top-left type chip):
  - Format: `3200 × 2133 · WebP · 480 KB`
  - Width pulled from `meta.width × meta.height`; format derived from `meta.format` (strip `image/` prefix, uppercase); size via existing `formatFileSize(meta.sizeBytes)`.
  - Leading dot indicates resolution health: green ≥2400, amber 1200–2399, red <1200, mapped to `bg-emerald-500 / bg-amber-500 / bg-red-500`.
  - Same `bg-background/80 backdrop-blur` glass treatment as the type chip; `text-[10px]`, `font-sans`, `tabular-nums`.

### 3. Bound focal-point fetch to 2048px

**`src/hooks/useFocalPointSuggestion.ts`** (line 28–35)
- Before invoking `suggest-focal-point`, transform `imageUrl` via `withSupabaseImageWidth(imageUrl, 2048)` (imported from `@/lib/image-utils`). For non-Supabase URLs the helper is a no-op so external/blob URLs are unchanged.
- Pass the transformed URL in the function `body`. Keep the `latestUrlRef` keyed on the *original* URL so concurrent-upload guards still match what callers compare against.

### 4. Pipe `mediaWidth` into `<HeroBackground>` from both consumers

**`src/components/home/HeroSection.tsx`** (lines 123 + 198)
- Read `heroConfig?.media_width` and pass `mediaWidth={heroConfig?.media_width ?? null}` to both `<HeroBackground>` instances.

**`src/components/home/HeroSlideRotator.tsx`** (line 149)
- Resolve the active slide's master width: prefer `slide.media_width` when the slide owns its background; fall back to `config.media_width` when `background_type === 'inherit'` (mirrors the existing `bgUrl` resolution at lines 81–85).
- Pass the resolved value as `mediaWidth` into `<HeroBackground>`.

## Out of scope (intentionally)

- `<link rel="preload" imageSrcSet>` for first slide LCP — separate optimization wave.
- Build-time test asserting every `pathPrefix="hero/…"` callsite passes `qualityProfile="hero"` — separate canon enforcement task.
- Backfill of `media_*` on legacy slides — captions silently degrade (UI tile shows no strip), which is the intended behavior.

## Enhancement suggestions (for after this lands)

1. Add a one-line tooltip on the resolution dot ("Recommended ≥2400px for retina hero") so the green/amber/red coding is self-explanatory.
2. When `meta.sizeBytes > 1.5MB` AND format is JPEG/PNG, surface an inline "Re-uploading would crunch this to WebP" hint — operator-driven optimization without breaking existing uploads.
3. Persist the `meta` capture on the `posterValue` upload path for videos too (currently only the video URL is captured) so the editor can show poster resolution health.
