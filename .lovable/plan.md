## Goal

Add a build-time regression guard so any future `pathPrefix="hero/…"` callsite is forced to also pass `qualityProfile="hero"`. Prevents a new hero surface from silently using the lossy `standard` profile (which is what caused the original pixelation bug).

## Context

- `MediaUploadInput` accepts a `qualityProfile?: 'standard' | 'hero'` prop. `'hero'` triggers the high-resolution path (3200px master, near-lossless WebP, dimension/size metadata).
- Today exactly 2 hero callsites pass it correctly:
  - `HeroSlidesManager.tsx` — `pathPrefix="hero/slides"` + `qualityProfile="hero"`
  - `HeroBackgroundEditor.tsx` — `pathPrefix="hero"` + `qualityProfile="hero"`
- Nothing prevents a future editor from adding `pathPrefix="hero/foo"` and forgetting the profile flag.
- Captions + LCP preload from the prior turns are already in place — no further work there.

## Plan

**1. Add Vitest regression test** — `src/test/hero-quality-profile.test.ts`

   Walk every `.tsx` file under `src/`, parse out each `<MediaUploadInput …/>` opening tag, and for any tag whose `pathPrefix` prop value contains the substring `hero` (template literal or string literal), assert the same tag also contains `qualityProfile="hero"`. Failures list the file + line so the regression is obvious.

   Implementation notes:
   - Use a regex pass over file contents (no AST dependency needed) — match `<MediaUploadInput\b[^/>]*/?>` across multiple lines, then inspect the captured tag body.
   - Skip `MediaUploadInput.tsx` itself (the component definition).
   - Test file lives alongside existing lint-rule tests, so it auto-runs under `bun run test` / CI's vitest sweep.

**2. No production code changes.** Existing two callsites already satisfy the rule, so the test passes on first run and only bites future regressions.

## Out of scope (already shipped in prior turns)

- Resolution caption strip + colored health dot on the upload tile
- Metadata persistence (`media_width/height/size_bytes/format`) on slides + hero background
- Tooltip on the resolution dot
- `<link rel="preload" as="image" imageSrcSet imageSizes>` for the first hero slide
- Video poster metadata probing
- 2048-bounded URL for AI focal-point suggestion
- `mediaWidth` cap piped into `<HeroBackground>` srcSet

## Files touched

- `src/test/hero-quality-profile.test.ts` (new)

## Enhancement suggestions for after this lands

1. Generalize the guard into a true ESLint rule (`hero-pathprefix-requires-quality-profile`) once a third hero callsite appears — easier IDE feedback than a Vitest failure.
2. Add the inverse check too: `qualityProfile="hero"` without a `pathPrefix` containing `hero` is probably a copy-paste from a hero editor and worth flagging.
3. Persist a `media_optimized_with_profile: 'hero' | 'standard'` field on the slide row, so the editor can surface a "Re-upload at higher quality" nudge for legacy assets uploaded before the hero profile existed.