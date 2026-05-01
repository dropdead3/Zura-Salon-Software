# Hero/Slider image quality enhancements

Three follow-ups to the previous "pixelated sliders" fix, focused on bandwidth, operator feedback, and AI accuracy.

---

## 1. Responsive `srcSet` on hero image (sharper desktop, faster mobile)

Today `HeroBackground` renders a single `<img src={url}>` at full upload resolution (~3200px WebP, often 400–900KB). On a phone that's a wasted 600KB; on a 5K display the browser still picks that one file.

Use Supabase Storage's on-the-fly image transforms (the `?width=` query param on the public URL — no re-upload, no extra storage) to produce a responsive `srcSet` with `w` descriptors. Browsers then pick the smallest variant that satisfies the rendered pixel density.

**Behavior**

- Hero `<img>` gets:
  - `srcSet` with widths `640, 960, 1440, 1920, 2560, 3200` — each entry is the same Storage object with a different `?width=` param.
  - `sizes="100vw"` (hero is full-bleed).
  - Original `src` retained as the fallback (unchanged behavior for legacy/external URLs).
- Skip transform for non-Supabase URLs (operator-pasted external links, blob: previews) — fall back to plain `src` so we don't break previews or external CDNs.
- Skip for video posters (videos already use `<video poster>` which doesn't support srcSet — keep as-is).

**Why this matters**

- 12.9" iPad (~2732px wide): picks the `2560w` variant ≈ 250–350KB instead of 700KB.
- iPhone 15 (~1179px CSS, 3x DPR ≈ 1290 device px wide hero): picks `1440w` ≈ 90KB.
- 5K Studio Display: still gets the full `3200w` for crispness.
- No quality regression — the original 3200px upload is still served when the device asks for it.

---

## 2. Upload metadata caption on the slide row

Operators currently get a single "Image uploaded · compressed 12MB → 480KB" toast that disappears in 3 seconds, then no persistent confirmation. They can't tell whether their slide is rendering at retina resolution or at thumbnail size.

Add a small caption directly under the slide's media preview, e.g. `3200 × 2133 · WebP · 480 KB`. Always-visible, monospace-feeling for digit alignment.

**Behavior**

- After a successful upload in `MediaUploadInput`, capture the final blob's `width × height × bytes × format` and surface it via the existing `onChange` payload (extend it with optional `meta`).
- Persist `media_width`, `media_height`, `media_size_bytes` on `HeroSlide` (and section-level `HeroConfig`) so the caption survives reloads.
- `MediaUploadInput`'s preview tile shows the caption when meta is present.
- Color-code lightly: green if width ≥ 2400 (retina-grade), amber if 1200–2399 (standard), red if < 1200 (too small for hero) — small dot, not a banner.
- Pasted URLs (no upload event): caption is hidden — we don't run a HEAD request to size them. (Acceptable: only uploads benefit from the badge; pastes are operator-owned.)

**Why this matters**

- Confirms the previous quality fix is actually landing high-resolution files (operator self-serve QA).
- Catches "wait, I uploaded a logo PNG to my hero slot" before publish.
- Makes per-slide weight visible — useful when a 5-slide carousel ships 4MB of images.

---

## 3. Verify focal-point suggestion uses the high-res asset

The previous fix made hero uploads skip the 1920×1200 re-encode and upload the autoCrunch output (3200px @ q0.9) directly. The focal-point AI call (`useFocalPointSuggestion`) runs server-side against `imageUrl`, which is the *uploaded URL returned by `onChange`*.

Confirm and pin this behavior:

- `HeroSlidesManager` calls `suggestFocal(url)` using the URL the upload returns. With the hero quality profile in place, that URL now points at the 3200px asset — exactly what we want for face/subject detection accuracy.
- Add a unit/regression test or doc comment in `MediaUploadInput` stating: "For `qualityProfile === 'hero'`, the URL passed to `onChange` is the autoCrunch output (≤ 3200px, q0.9), never the 1920×1200 re-encode. Downstream AI consumers (focal-point detector, alt-text generator) rely on this contract."
- Pass an explicit `?width=2048` to the focal-point call's `imageUrl` (Storage transform) so the server-side fetch is bounded — a 2048px source is plenty for face detection and avoids the AI service downloading the full 3200px file every time.

**Why this matters**

- Locks the contract so future "let's re-encode hero uploads at 1920" optimizations don't silently degrade focal accuracy.
- Bounds the focal-point edge function's bandwidth/latency per request.

---

## Files affected

- `src/components/home/HeroBackground.tsx` — add `srcSet` builder for Supabase Storage URLs.
- `src/lib/image-utils.ts` — add `buildSupabaseSrcSet(url, widths)` helper.
- `src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx` — capture upload meta (width/height/bytes/format) and pass via `onChange`; render caption on preview tile.
- `src/hooks/useSectionConfig.ts` — extend `HeroSlide` and `HeroConfig` with optional `media_width`, `media_height`, `media_size_bytes`.
- `src/components/dashboard/website-editor/HeroSlidesManager.tsx` + `HeroBackgroundEditor.tsx` — persist meta, pass to caption.
- `src/hooks/useFocalPointSuggestion.ts` — append `?width=2048` transform to the URL it sends.
- DB: lightweight non-breaking migration only if we want server-side persistence beyond the JSON-blob `site_settings` payload — these fields can live inside the existing JSON config (no schema change required).

## Out of scope

- AVIF output (Storage doesn't support it on transform yet; revisit when available).
- Blurhash / LQIP placeholders (separate enhancement; would deserve its own pass).
- Auto-generated alt text (separate AI call; not part of this fix).
