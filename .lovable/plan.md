# Honest Re-scope: One Real Win, Two Speculative Ideas

When I scoped the codebase, my own enhancement suggestions from last turn turned out to be partially wrong. Calling that out before doing any work.

## What I claimed vs. what's actually there

| Suggestion | Reality |
|---|---|
| "Apply pattern to `ImageUploadInput` — testimonials, gallery, blog hero have the same redundancy" | **False.** None of those surfaces pair upload with `FocalPointPicker` today. Gallery tiles, transformations, custom sections, and section-style backgrounds upload images without focal control at all. There's nothing redundant to consolidate. |
| "Promote `focal` to a richer overlay slot (face boxes, rule-of-thirds)" | **Speculative.** No face-detection API is wired. The existing `useFocalPointSuggestion` hook already AI-seeds the crosshair on upload. No user signal that the crosshair is insufficient. |
| Hidden actual win I missed | **`HeroSlidesManager.tsx:409`** still renders the old stacked `MediaUploadInput` + `<FocalPointPicker>` pattern for per-slide focal override — it's the *slide manager's* inline editor, distinct from the `HeroSlideEditor` we already fixed. Same operator complaint, same image rendered twice. |

## What I'm proposing

### Ship now (real, scoped)

**Fix the one remaining stacked-image instance in `HeroSlidesManager.tsx`.**

- Find the `<MediaUploadInput>` that pairs with the `<FocalPointPicker>` at line 409
- Pass `focal={...}` with `enabled: focalOverridden && resolvedFit !== 'contain'`
- Delete the standalone `<FocalPointPicker>` block and its surrounding `<ToggleInput>`-only wrapper if no longer needed (keep the toggle, drop the picker)
- Drop the `FocalPointPicker` import from `HeroSlidesManager.tsx`

After this, the only remaining `FocalPointPicker` consumer is the test fixture and the component file itself — safe to keep exported for future non-upload focal needs.

### Defer (with explicit revisit triggers — Deferral Register)

| Idea | Why defer | Revisit trigger |
|---|---|---|
| Per-tile focal on `ImageUploadInput` (gallery, testimonials, custom sections) | No operator complaint exists. Adding focal where there was none is a feature pitch, not a redundancy fix. Two divergent `ImageUploadInput` components would need consolidation first. | First operator request for "my gallery tile is cropping someone's face off" OR a unified `ImageUploadInput` refactor lands. |
| Face-box / rule-of-thirds overlay slot | No face-detection wiring; the AI focal suggestion already covers the 80% case (auto-seed crosshair). Speculative API surface. | A face-detection edge function ships, OR operators report the AI seed is missing faces frequently enough to warrant a manual visual aid. |

## Files Touched

- `src/components/dashboard/website-editor/HeroSlidesManager.tsx` — wire `focal` on the `MediaUploadInput`, delete the standalone picker, drop the import.

## Out of Scope

- Any change to `ImageUploadInput` (either copy)
- Any change to the existing tests
- Any new overlay-slot API on `MediaUploadInput`

## Risk

Low. Identical change to the one we just landed in `HeroSlideEditor.tsx`, against a sibling editor with the same prop shape. Existing `MediaUploadInput.test.tsx` covers the focal-overlay contract.
