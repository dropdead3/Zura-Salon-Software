# Hero Section Editor — Hub & Sub-Editor Restructure

## Problem

Today `HeroEditor.tsx` stacks every concern into one ~380-line scroll: Background Media, Text Colors, Scrim, Slides, Content Alignment, Eyebrow, Headline, Subheadline, CTAs, Below-Button Notes, Animation timing, Scroll Indicator. Operators have to scroll through unrelated controls to reach the one knob they came for.

## Goal

Replace the long stack with a **two-level pattern**:

1. **Hero Hub** (default view) — a clean grid of clickable category cards, each summarizing what it controls and showing a tiny status preview (e.g. "Image · Cover · Center-focused").
2. **Sub-editor view** — clicking a card opens a focused editor with a back arrow + breadcrumb ("← Hero / Background Media"). Only that surface's controls are visible.

This mirrors the existing `WebsiteEditorShell` hub-then-detail pattern, just nested one level deeper inside the Hero tab.

## Card Categories

Six categories, each maps to existing code with no behavior change:

| Card | Icon | Controls | Source |
|---|---|---|---|
| Background Media | Image | bg type, image/video URL, fit, focal point | `HeroBackgroundEditor` (already self-contained) |
| Text & Buttons Color | Palette | headline/sub/CTA color overrides | `HeroTextColorsEditor` |
| Text-area Scrim | Layers | scrim style + strength | `HeroScrimEditor` |
| Slides Rotator | Images | multi-slide rotator config | `HeroSlidesManager` |
| Content & Copy | Type | alignment, eyebrow, headline, rotating words, sub, CTAs, notes | inline JSX block in `HeroEditor` (lines 125–315) |
| Advanced | Settings2 | animation timing, scroll indicator | inline JSX block (lines 318–377) |

## UX Spec

```text
┌─ Hero Section ─────────────────────────────────────┐
│  Configure how your homepage hero looks and reads. │
├────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 🖼  Background │  │ 🎨 Text Colors│   ▶ click    │
│  │ Image · Cover │  │ Auto-contrast │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 🌫  Scrim     │  │ 🎞  Slides    │                │
│  │ Bottom · 55%  │  │ 0 slides      │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ ✍  Content   │  │ ⚙  Advanced  │                │
│  │ Center align │  │ 5s rotation   │                │
│  └──────────────┘  └──────────────┘                │
└────────────────────────────────────────────────────┘
```

Sub-editor view:

```text
┌─ ← Hero / Background Media ────────────────────────┐
│  [existing HeroBackgroundEditor content unchanged] │
└────────────────────────────────────────────────────┘
```

## Implementation

### 1. New component: `HeroEditorHubCard`
Small presentational card: icon + title + 1-line status summary + chevron-right. Hover lifts via existing `bg-card/80` glass tokens. Identical visual language as `WebsiteEditorSidebar` group rows so it feels native.

### 2. Refactor `HeroEditor.tsx`

- Add local state: `const [view, setView] = useState<HeroView>('hub')` where `HeroView = 'hub' | 'background' | 'colors' | 'scrim' | 'slides' | 'content' | 'advanced'`.
- Persist `view` in `localStorage` keyed `zura.heroEditor.view.<orgId>` so refresh keeps you on the sub-editor you were editing (mirrors `WebsiteEditorShell.writePersisted`).
- Render hub grid when `view === 'hub'`; otherwise render a back-bar (`<button onClick={() => setView('hub')}><ArrowLeft/> Hero / {label}</button>`) + the matching sub-editor.
- Move the inline "Content & Copy" JSX (alignment, eyebrow, headline, sub, CTAs, notes) into a new `HeroContentEditor.tsx` for symmetry — it's currently the only block not extracted, and extracting it makes the sub-editor switch trivial.
- Move the inline "Advanced" Collapsible into a new `HeroAdvancedEditor.tsx` (animation timing + scroll indicator). Drops the Collapsible — it's no longer needed since Advanced is its own focused page.

### 3. Status summary helpers
Each card shows a 1-line summary computed from `localConfig`:
- Background: `{type === 'video' ? 'Video' : 'Image'} · {fit} · {focal_point ? 'Custom focus' : 'Centered'}`
- Colors: count of overrides set (e.g. "2 colors customized" or "Auto-contrast")
- Scrim: `{scrim_style} · {Math.round(scrim_strength * 100)}%`
- Slides: `{slides.length} slide{s}` or "Off"
- Content: `{content_alignment} aligned · "{headline_text.slice(0,20)}…"`
- Advanced: `{word_rotation_interval}s rotation · scroll {show_scroll_indicator ? 'on' : 'off'}`

### 4. Dirty-state preservation

Crucial: `localConfig`, `useDirtyState`, `usePreviewBridge`, `useEditorSaveAction`, and `handleSave` stay at the **HeroEditor parent level**. Sub-editor components receive `(value, onChange)` props and never own save state. This means:
- Switching between sub-editor views does NOT lose unsaved edits.
- ⌘S and the global "Save" button still work from any sub-view.
- The "Draft saved just now" pill in the toolbar continues to reflect hero edits regardless of which sub-view is open.

### 5. Visibility of Reset

The "Reset to defaults" button currently lives in the inline Content card header. Move it into the hub view as a low-emphasis link in the hub footer (`Reset hero to defaults`) so it's discoverable from one place, not buried inside a sub-editor.

## Files

**New:**
- `src/components/dashboard/website-editor/hero/HeroEditorHubCard.tsx` — card primitive
- `src/components/dashboard/website-editor/hero/HeroContentEditor.tsx` — extracted content & copy block
- `src/components/dashboard/website-editor/hero/HeroAdvancedEditor.tsx` — extracted animation/scroll block

**Edited:**
- `src/components/dashboard/website-editor/HeroEditor.tsx` — becomes the hub router (~120 lines, down from 380)

**Untouched** (already self-contained sub-editors): `HeroBackgroundEditor`, `HeroTextColorsEditor`, `HeroScrimEditor`, `HeroSlidesManager`.

## What this is NOT

- Not changing any field, default, or save behavior.
- Not adding new toolbar/breadcrumb chrome to `WebsiteEditorShell` — the back-nav lives inside the Hero tab content area.
- Not touching the live `HeroSection.tsx` rendering path or `HeroNotes`/`heroAlignment` canon.
- Not touching other section editors (Brand Statement, Footer, etc.). If you like the pattern, we can sweep them separately.
