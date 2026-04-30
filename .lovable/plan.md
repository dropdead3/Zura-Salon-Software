## Hero Background Media + Multi-Slide Rotator

Add per-tenant background media (image or video) to the Hero section, plus a **Revolution-Slider-style** multi-slide system where each "slide" carries its own background, eyebrow, headline, subheadline, and CTAs and rotates on a configurable interval.

### What changes for the operator

In the Hero editor sidebar:
1. **Background Media** card (always visible): upload an image or MP4, choose `cover` / `contain`, set overlay opacity (0–80%). Used as the static background when there's only one slide.
2. **Hero Slides** card: add/edit/reorder/delete slides. Each slide row exposes:
   - Background media (image upload, video upload, or "inherit from section background")
   - Eyebrow (optional, with toggle)
   - Headline text
   - Subheadline lines 1 & 2
   - CTA labels + URLs (primary/secondary)
   - Per-slide overlay opacity override
3. **Rotation Settings**: enable/disable auto-rotate, slide duration (3–15s), transition style (`fade` / `crossfade` / `slide-up`), pause on hover toggle.

If the operator only ever adds one slide, behavior matches today's hero with the new background image/video underneath.

### What changes on the canvas

- Background `<video>` (autoplay, muted, loop, playsInline, `preload="metadata"`) or `<img>` renders behind the hero text, with an overlay div using the configured opacity for legibility.
- When `slides.length > 1` and `auto_rotate` is on, slides cross-fade on the configured interval. Foreground text (headline, subheadline, CTAs) animates in per slide via Framer Motion's `AnimatePresence`.
- Pagination dots + prev/next arrows render at the bottom of the section when multiple slides exist (hidden if 1 slide).
- Reduced-motion / preview mode: hold the first slide static, no auto-rotate.

### Inline editing on the canvas

- Background media edits happen in the sidebar (image/video picking on canvas would crowd the surface).
- Per-slide text fields stay inline-editable via `InlineEditableText` with field paths like `slides.0.headline_text`, `slides.0.eyebrow`, etc. Wildcard `slides.*.*` will be added to the `InlineEditCommitHandler` allow-list so all slide text fields commit.

### Schema additions to `HeroConfig` (in `useSectionConfig.ts`)

```ts
interface HeroSlide {
  id: string;                    // stable uuid for keys + dnd
  background_type: 'image' | 'video' | 'inherit';
  background_url: string;        // image or mp4 url
  background_poster_url?: string;// optional poster for video
  overlay_opacity?: number;      // null = inherit
  eyebrow: string;
  show_eyebrow: boolean;
  headline_text: string;
  subheadline_line1: string;
  subheadline_line2: string;
  cta_new_client: string;
  cta_new_client_url: string;
  cta_returning_client: string;
  cta_returning_client_url: string;
  show_secondary_button: boolean;
}

interface HeroConfig {
  // ...existing fields kept for back-compat
  background_type: 'none' | 'image' | 'video';
  background_url: string;
  background_poster_url: string;
  background_fit: 'cover' | 'contain';
  overlay_opacity: number;        // 0..0.8
  slides: HeroSlide[];            // empty = use legacy single-hero fields
  auto_rotate: boolean;
  slide_interval_ms: number;      // default 6000
  transition_style: 'fade' | 'crossfade' | 'slide-up';
  pause_on_hover: boolean;
}
```

`DEFAULT_HERO` gets these fields with `background_type: 'none'`, `slides: []`, `auto_rotate: true`, `slide_interval_ms: 6000`, `transition_style: 'crossfade'`, `pause_on_hover: true`.

### Storage

- Reuse existing `website-sections` public bucket. Path prefix: `hero/{org_id}/`.
- New `VideoUploadInput` component (mirrors `ImageUploadInput`) — accepts `video/mp4, video/webm`, 50MB soft cap with toast warning, no transcode (operator's responsibility), generates a poster frame from the first video frame using a hidden `<video>` + `<canvas>` and uploads it alongside.

### Files

**New**
- `src/components/dashboard/website-editor/inputs/VideoUploadInput.tsx` — drag/drop + poster auto-capture.
- `src/components/dashboard/website-editor/HeroSlidesManager.tsx` — sortable list of slide editors (dnd-kit, mirrors `DrinksManager`).
- `src/components/dashboard/website-editor/HeroBackgroundEditor.tsx` — media picker + fit + overlay slider.
- `src/components/home/HeroBackground.tsx` — renders `<img>` or `<video>` + overlay; isolated for reuse by both single-slide and slide rotator paths.
- `src/components/home/HeroSlideRotator.tsx` — handles `AnimatePresence`, interval, pagination dots, arrows, hover-pause.

**Edited**
- `src/hooks/useSectionConfig.ts` — extend `HeroConfig` + `DEFAULT_HERO`.
- `src/components/dashboard/website-editor/HeroEditor.tsx` — mount `HeroBackgroundEditor` and `HeroSlidesManager` above the existing single-hero fields; collapse the legacy fields under "Default Slide Content (used when no slides are added)".
- `src/components/home/HeroSection.tsx` — branch: if `slides.length > 1` use `HeroSlideRotator`; else render the existing layout with `HeroBackground` underneath. Keep the preview/static branch intact.
- `src/components/dashboard/website-editor/InlineEditCommitHandler.tsx` — register new allowed paths for `section_hero`: `background_url`, `background_type`, `overlay_opacity`, `slides.*.headline_text`, `slides.*.eyebrow`, `slides.*.subheadline_line1`, `slides.*.subheadline_line2`, `slides.*.cta_new_client`, `slides.*.cta_new_client_url`, `slides.*.cta_returning_client`, `slides.*.cta_returning_client_url`, `auto_rotate`, `slide_interval_ms`, `transition_style`.

### Performance & accessibility

- Video uses `preload="metadata"`, `playsInline`, `muted`, `loop`, `autoplay`. Poster image shown until video can play.
- Respects `prefers-reduced-motion`: video still plays (operator-uploaded content) but slide auto-rotation pauses.
- Pagination dots + prev/next arrows have `aria-label`s; arrow keys navigate when section is focused.
- Overlay opacity capped at 0.8 to keep media visible.

### Out of scope

- Server-side video transcoding / thumbnail generation (relying on browser canvas capture).
- Per-slide custom fonts / colors (slides inherit section typography).
- Ken Burns / zoom effects on background images (can be a follow-up).
- Mobile-specific media swap (uses same media at all breakpoints with `object-cover`).
