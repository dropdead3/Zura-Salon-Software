# Consolidate Media Upload + Focal Point Picker

## Problem

Both the section background editor and per-slide background editor render the **same uploaded image twice** stacked vertically:

1. `MediaUploadInput` shows the thumbnail with metadata + Replace/Remove
2. `FocalPointPicker` shows the SAME image again with a draggable crosshair

On a tall portrait hero photo (e.g. 1920×2880) this consumes nearly a full screen of editor space and reads as redundant — you can see the focal-point overlay perfectly well on the upload tile itself.

## Approach

Make the upload tile **focal-aware**. When `focal` props are provided and the asset is an image (or video with a poster), the existing thumbnail becomes the interactive focal-point surface — same drag handle, reset link, and helper copy as today's `FocalPointPicker`, just rendered inside the upload tile instead of as a separate card below it.

The standalone `FocalPointPicker` stays exported for places that pass it a non-uploaded image, but the two hero editors stop rendering it.

```text
BEFORE                              AFTER
┌─────────────┐                     ┌─────────────┐
│ Upload tile │  (thumbnail #1)     │ Upload tile │  ← drag crosshair lives
│   [DRAFT]   │                     │   [DRAFT]   │    here, on the same image
│  [1920×2880]│                     │  [1920×2880]│
└─────────────┘                     │      ◯      │  ← focal handle overlay
or paste URL [____]                 └─────────────┘
                                    Reset to center  (1 line, only when off-default)
[Override Focal Point ▢]            or paste URL [____]
┌─────────────┐
│ Focal pick  │  (thumbnail #2)
│      ◯      │
└─────────────┘
Reset to center
```

## Scope

### New: `MediaUploadInput` gains an optional `focal` prop

```ts
focal?: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  onReset: () => void;
  /** When false, suppresses the overlay (e.g. fit=contain or override toggle off). */
  enabled?: boolean;
};
```

When `focal` is provided AND the tile is showing an image (or video poster), the tile renders:
- Pointer-event surface mirroring `FocalPointPicker.handlePointerDown/Move/Up`
- The same crosshair handle absolutely positioned at `({x}%, {y}%)`
- `objectPosition: ${x}% ${y}%` on the existing `<img>` so the operator sees the live crop
- `cursor-crosshair` on the tile when enabled
- "Reset to center" link rendered above the tile (only when not at 50/50, matching today's UX)

When `focal` is omitted (every other consumer of `MediaUploadInput`), behavior is unchanged.

### Updated: `HeroBackgroundEditor` (section-level)

- Remove the standalone `<FocalPointPicker>` block (the `!!background_url && fit === 'cover'` branch)
- Pass `focal={...}` to `<MediaUploadInput>` with `enabled = !!background_url && background_fit === 'cover'`

### Updated: `HeroSlideEditor` (per-slide)

- Keep the "Override Focal Point" toggle (it has semantic meaning — without override, the slide inherits the section focal)
- When the toggle is ON, pass `focal={...}` to `<MediaUploadInput>` instead of rendering a separate picker below
- When OFF, omit `focal` so the tile is a plain upload preview
- The "Override Fit" toggle and its Cover/Contain pills stay where they are (they're not redundant)

### Tests

Add a Vitest for `MediaUploadInput` covering:
- `focal` prop renders crosshair handle at the correct percentages
- `cursor-crosshair` only applied when `focal.enabled !== false`
- `onChange` fires with clamped 0-100 percentages on pointer events
- No focal overlay when `focal` prop is absent (back-compat)

## Files Touched

- `src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx` — extend props + render focal overlay inside the existing thumbnail block
- `src/components/dashboard/website-editor/HeroBackgroundEditor.tsx` — drop standalone picker, pass `focal` prop
- `src/components/dashboard/website-editor/hero/HeroSlideEditor.tsx` — drop standalone picker, pass `focal` prop gated on `focalOverridden`
- `src/components/dashboard/website-editor/inputs/MediaUploadInput.test.tsx` (new) — focal overlay behavior

`FocalPointPicker.tsx` is left in place (still exported) so any future consumer that needs a focal picker over a non-uploaded image isn't blocked.

## Out of Scope

- Visual restyle of the upload tile (size, aspect ratio, badges) — keeps the existing 16:9-ish 128px-tall preview
- Changes to the public site renderers
- Changes to schema, hooks, or the `useFocalPointSuggestion` AI seeding flow

## Risks

- **Pointer events vs Replace/Remove hover overlay**: Today the tile has a hover overlay with Replace/Remove buttons. The pointer-down handler for focal must not swallow clicks on those buttons. Mitigation: render the focal pointer-surface on the `<img>` only (via `pointer-events-auto` + capture on the image element), and keep the hover overlay layered above with its own `pointer-events-auto`. Verified pattern: today's `FocalPointPicker` uses `setPointerCapture` on the target — easy to replicate.
- **Video kind**: For videos the focal target is the poster image; the tile currently renders a `<video>` element, not an `<img>`. The focal overlay must render on the poster (an `<img>` we'll layer on top when `focal` is present and the asset is a video with a poster). Behavior matches today's `FocalPointPicker`, which already uses `posterUrl` for video sources.
