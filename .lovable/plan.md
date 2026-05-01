
## Goal

In **Background-Only** rotator mode, the slide list stops looking like a sequence of editable slides and starts looking like what it actually is: **one slide, with a gallery of rotating backgrounds**. Editing copy on slides 2…N is structurally meaningless in this mode (only slide 1's headline/CTAs render), so the UI should make that impossible to misread.

## UX Model

```text
Multi-Slide mode (today, unchanged)              Background-Only mode (new)
─────────────────────────────────────            ──────────────────────────────────────
[≡] [thumb] SLIDE 1  Default       › │           ┌─ SLIDE 1 · Master ───────────┐
    Headline A                       │           │  [thumb]  Headline A         │
    Image · Custom focus · 2 CTAs    │           │  Edit copy & buttons here  › │
─────────────────────────────────────            └──────────────────────────────┘
[≡] [thumb] SLIDE 2                ›
    Headline B                                   ROTATING BACKGROUNDS  (2 of N)
    Image · Custom focus · 2 …                   ┌────┐ ┌────┐ ┌────┐ ┌────┐
─────────────────────────────────────             │img │ │img │ │vid │ │ +  │
[+ Add Slide]                                    │ ✕  │ │ ✕  │ │ ✕  │ │Add │
                                                  └────┘ └────┘ └────┘ └────┘
                                                  drag to reorder · click ✕ to remove
```

Slide 1 keeps its full editor (it owns the headline, CTAs, eyebrow, scrim, text colors). Slides 2…N collapse into **background tiles** — upload, focal point, drag to reorder, remove. No headline, no CTA, no overlay overrides surfaced. The data model is unchanged; this is a *view* over the same `config.slides` array.

## Behavior

1. **Mode switch is reversible & non-destructive.** Switching to Background-Only never deletes slides 2…N's copy — it just hides those fields. Switching back to Multi-Slide restores the full editor with copy intact (the existing `slideBackground_only_since` stamp + `MODE_DEFAULTS` logic stays as-is).
2. **Slide 1 = "Master" badge** replaces the existing "Default" star. Copy in the row reads "Master · headline & buttons shared across all backgrounds" instead of repeating the headline.
3. **Background tiles use the existing `MediaUploadInput` with `focal` overlay** (the consolidated component from the earlier sweep). Each tile = one slide's background. Click tile → opens a compact dialog with: media upload, focal point (already overlaid), per-tile fit override, per-tile scrim override. No headline/CTA fields.
4. **"Add Background" tile** at the end of the gallery. Clicking it appends a new slide with `background_type: 'image'` and empty copy fields (which won't render in this mode anyway).
5. **Drag-to-reorder** works tile-to-tile inside the gallery, just like the existing list reorders. Slide 1 is **not** part of the gallery — it's pinned above as the master row.
6. **Empty state**: if Background-Only is selected but only slide 1 exists, the gallery shows the "Add Background" tile + helper text *"Add a second background to start the rotator. The headline above stays the same on every rotation."* This complements the existing `staticHeroHint` in `HeroRotatorEditor` (which detects the >7-day stuck-with-1-slide case).
7. **Inactive (`active === false`) backgrounds** render with the existing `grayscale` + reduced opacity, with the eye toggle in the tile's hover cluster.

## Technical Plan

All changes are confined to two files; no schema migration, no doctrine changes.

### `src/components/dashboard/website-editor/HeroSlidesManager.tsx`
- Read `mode = config.rotator_mode ?? 'multi_slide'` at the top of `HeroSlidesManager`.
- Branch the render:
  - `mode === 'multi_slide'` → existing accordion list (no change).
  - `mode === 'background_only'` → new layout:
    1. Render slide 1 as a single **"Master Slide"** row using a trimmed `HeroSlideListCard` (or a thin wrapper) with the "Master" badge and a chevron that opens the existing `SlideRow` accordion *just for slide 1*.
    2. Below it, render a **`BackgroundGallery`** subcomponent (new, in same file) — a CSS grid (`grid-cols-2 sm:grid-cols-3`) of `BackgroundTile`s for slides[1..].
- New `BackgroundTile` subcomponent (in the same file, ~80 lines):
  - Square aspect, rounded-xl, shows the background thumbnail (or video poster).
  - Hover cluster: drag handle (top-left), eye toggle (top-right), trash (top-right, next to eye), edit pencil (center on hover) → opens a small dialog with `MediaUploadInput` (with `focal` prop), the existing fit toggle, the existing scrim override.
  - Reuses `useSortable` from `@dnd-kit` exactly like `SlideRow` does today, so reorder logic stays in `onDragEnd`.
  - Shows a `+` "Add Background" tile at the end of the grid.
- The existing `Rotation Settings` block at the bottom stays as-is (it's mode-agnostic).

### `src/components/dashboard/website-editor/hero/HeroSlideListCard.tsx`
- Already has `rotatorMode` prop and special-cases the "Background only" italic label. **Add a `variant="master"` prop** that, when true, replaces the "Default" star badge with a "Master" badge and updates the helper line to *"Headline & buttons shared across all backgrounds"*. This keeps slide 1's row visually distinct from the gallery below.

### What does NOT change
- `HeroConfig`, `HeroSlide`, the `slides` array shape, `rotator_mode` enum.
- `HeroRotatorEditor` (mode picker stays where it is, in its own card).
- The live-site rotator rendering — it already correctly ignores slides 2…N's copy in `background_only` mode.
- `MediaUploadInput`, `FocalPointPicker` ownership canon, draft-event canon, dirty-state canon — all untouched.

## QA

- Switch Multi-Slide → Background-Only with 3 slides authored. Verify: slide 1 stays editable; slides 2 & 3 reduce to gallery tiles; their headline/CTA copy is preserved (visible again after switching back).
- Drag tile 3 in front of tile 2. Verify reorder persists and the live preview rotates in the new order.
- Click "Add Background" → verify a new slide is appended with `background_type: 'image'` and the new tile appears with the upload affordance.
- Delete a tile via trash → verify confirm dialog (reuse `HeroSlideListCard`'s existing `AlertDialog` pattern) and removal.
- Eye-toggle a tile → verify it grayscales and is excluded from the live rotator.
- Single-slide background-only state → verify only the "Master" row + the "Add Background" tile + helper text render.

## Out of Scope (mention only)

- Bulk upload (drop 5 images at once → 5 tiles). Worth doing later but not required to validate the UX shift.
- "Copy section background to slide" shortcut — separate issue, separate PR.
