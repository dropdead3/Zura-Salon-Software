# Hero Editor → Slider Revolution Model

## Goal

Reframe the Hero editor so **slides are the primary editable unit** (each with its own background image/video + headline + subheadline + CTAs), while **layout-level concerns (scrim, alignment, animation, global colors)** stay one level up and apply to every slide.

This matches how operators mentally model a hero rotator: "I'm editing slide 2's image and copy" vs. "I'm setting how all slides look."

## New Information Architecture

```text
HERO SECTION
├── SLIDES (per-slide content — the primary surface)
│   ├── Slide 1   [thumbnail] Headline preview      ▸
│   ├── Slide 2   [thumbnail] Headline preview      ▸
│   ├── Slide 3   [thumbnail] Headline preview      ▸
│   └── + Add slide
│
└── GLOBAL HERO SETTINGS (applies to every slide)
    ├── Text-area Scrim          gradient bottom · 100%   ▸
    ├── Text & Buttons Color     Auto-contrast            ▸
    ├── Content Alignment        Left aligned             ▸
    ├── Slides Rotator           Auto-rotate · 5.5s       ▸
    └── Advanced                 Animation, scroll cue    ▸
```

The hub view splits into two clearly labeled groups instead of six equal cards.

## Per-Slide Editor

Clicking a slide opens a focused editor with **only the things that legitimately vary per slide**:

- **Background media** — image/video upload, focal point, fit (cover/contain)
- **Copy** — eyebrow, headline, subheadline lines
- **CTAs** — primary + secondary button labels and URLs
- **Per-slide overrides (collapsed by default)** — scrim style, scrim strength, text colors, alignment. These are advanced overrides; default is "inherit from global."

Slide rows in the list show:
- A small thumbnail of the slide's background image (or a video icon)
- The slide's headline as the primary label
- A muted summary line (e.g. "Image · Custom focus · 2 CTAs")
- Drag handle for reorder, delete button

The first slide gets a subtle "Default / fallback" badge — clarifies that when the rotator is off, slide 1 is what visitors see.

## Global Settings Editor

Each global setting opens its own focused sub-view (same hub-and-spoke pattern that exists today):

- **Scrim** — already exists, unchanged
- **Text & Buttons Color** — already exists, unchanged
- **Content Alignment** — extracted from the current "Content & Copy" editor (alignment is the only piece that's genuinely global; copy fields move into per-slide)
- **Rotator behavior** — auto-rotate toggle, interval, transition style, pause-on-hover (currently buried inside `HeroSlidesManager`)
- **Advanced** — animation timing, scroll indicator (unchanged)

## What Goes Away

- The current top-level **"Content & Copy"** card disappears as a global concept. The headline/subheadline/CTA fields it edits today are migrated into "Slide 1" automatically (back-compat, see Migration below). Alignment becomes its own small card.
- The legacy single-background editor (`HeroBackgroundEditor` at the section level) is hidden when slides exist; if there are zero slides, the hub auto-creates Slide 1 from the section-level background + headline so there's always at least one slide to edit.

## Migration / Back-Compat

On first open of the new editor for an existing org:
1. If `slides.length === 0` AND any of `background_url` / `headline_text` / `cta_new_client` are set → synthesize Slide 1 from the section-level fields (no DB write yet, just in-memory). Operator hits Save to persist.
2. If `slides.length > 0` → ignore the legacy section-level background/copy fields in the UI; they're still in the DB for the renderer's fallback path but not surfaced as editable.

Renderer behavior (`HomepageHero` and editor preview) is untouched — the data model already supports this; only the editor UI changes.

## Files

**New:**
- `src/components/dashboard/website-editor/hero/HeroSlideListCard.tsx` — slide row with thumbnail, headline, summary, drag handle, delete
- `src/components/dashboard/website-editor/hero/HeroSlideEditor.tsx` — focused per-slide editor (media + copy + CTAs + collapsed overrides)
- `src/components/dashboard/website-editor/hero/HeroRotatorEditor.tsx` — extracted rotator behavior controls (auto-rotate, interval, transition, pause-on-hover) from `HeroSlidesManager`
- `src/components/dashboard/website-editor/hero/HeroAlignmentEditor.tsx` — small focused alignment picker (extracted from `HeroContentEditor`)

**Edited:**
- `src/components/dashboard/website-editor/HeroEditor.tsx` — new hub layout (two grouped sections), new view router (`'slide:<id>'` for per-slide, plus the global views), back-compat migration on mount
- `src/components/dashboard/website-editor/hero/HeroEditorHubCard.tsx` — add optional `thumbnail` slot for slide rows (image preview)
- `src/components/dashboard/website-editor/hero/HeroContentEditor.tsx` — strip out per-slide copy fields; reduce to alignment-only OR delete in favor of `HeroAlignmentEditor`

**Reused unchanged:**
- `HeroBackgroundEditor`, `HeroTextColorsEditor`, `HeroScrimEditor`, `HeroAdvancedEditor`, `HeroSlidesManager` (legacy — kept around for the rotator-controls extraction, or fully replaced)

## Technical Notes

- View state extends to `HeroView = 'hub' | 'scrim' | 'colors' | 'alignment' | 'rotator' | 'advanced' | { kind: 'slide', id: string }`. Persisted to localStorage per-org as today.
- All edits flow through the existing `localConfig` + `useDirtyState` + ⌘S save pipeline at the parent. No new save plumbing.
- Per-slide updates use the existing `updateSlide(id, patch)` pattern from `HeroSlidesManager`.
- Slide reorder uses the existing `@dnd-kit` setup lifted out of `HeroSlidesManager`.
- Hub cards in the **Slides** group render with a 48×32 thumbnail to the left of the icon slot (extends `HeroEditorHubCard`).
- Hub cards in the **Global Settings** group keep the current icon-only layout.
- Group headers use `font-display text-[11px] tracking-wider text-muted-foreground uppercase` (same Termina micro-label treatment used elsewhere).

## Out of Scope (Future)

- Drag-to-reorder slides from the hub list (deferred — initial pass uses up/down arrows or move-to-position)
- Per-slide preview thumbnails generated from rendered output (initial pass uses the raw background image)
- Bulk-apply ("copy this slide's CTAs to all slides") — flagged as a Phase 2 ergonomic if operators ask
