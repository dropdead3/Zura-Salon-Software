## Section Background, Container & Media Overlays — Universal Editor

### Goal
Every section gets a unified "Background & Container" editor giving operators:
1. **Section background** — color, gradient, image, or video (with overlays/grain)
2. **Container background** — an inset content frame (color, gradient, image/video, radius, padding)
3. **Media overlays** — darken/lighten scrim, grain texture, blur, vignette, opacity

This extends the existing `SectionStyleEditor` (which already covers section bg color/gradient/image, padding, max-width, radius) with: video support, overlay/grain/vignette controls, and a new container layer.

---

### 1) Schema extension — `StyleOverrides`

Extend `src/components/home/SectionStyleWrapper.tsx`:

```ts
export interface StyleOverrides {
  // Existing
  background_type: 'none' | 'color' | 'gradient' | 'image' | 'video';  // + video
  background_value: string;            // url for image/video, css for gradient, hex for color
  background_poster_url?: string;      // video poster
  background_fit?: 'cover' | 'contain';
  background_focal_x?: number;         // 0..100
  background_focal_y?: number;

  // NEW — Section media overlays (apply over image/video bg)
  overlay_mode?: 'none' | 'darken' | 'lighten' | 'color';
  overlay_color?: string;              // when overlay_mode === 'color'
  overlay_opacity?: number;            // 0..1
  grain_intensity?: number;            // 0..1 — SVG noise overlay
  vignette_strength?: number;          // 0..1 — radial dark edges
  background_blur?: number;            // 0..20 px

  // Existing
  padding_top, padding_bottom, max_width, text_color_override,
  border_radius, heading_scale, eyebrow_visible

  // NEW — Container layer (inset frame around content)
  container_enabled?: boolean;
  container_background_type?: 'none' | 'color' | 'gradient' | 'image' | 'video';
  container_background_value?: string;
  container_background_poster_url?: string;
  container_overlay_mode?: 'none' | 'darken' | 'lighten' | 'color';
  container_overlay_color?: string;
  container_overlay_opacity?: number;
  container_grain_intensity?: number;
  container_padding?: number;          // inner padding px
  container_radius?: number;           // 0..48
  container_max_width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
```

Renders as two stacked layers in `SectionStyleWrapper`:
- Outer `<section>` carries section bg + section media + scrim/grain/vignette layers
- Inner `<div>` (when `container_enabled`) carries container bg + overlays + radius + padding

---

### 2) New shared editor — `SectionBackgroundEditor`

`src/components/dashboard/website-editor/inputs/SectionBackgroundEditor.tsx`

Reused for both **section** and **container** (via a `scope: 'section' | 'container'` prop that prefixes keys). Sub-blocks:

- **Background type** chips: None / Color / Gradient / Image / Video
- **Color** → `ThemeAwareColorInput` (theme tokens + in-use)
- **Gradient** → preset chips + custom CSS input
- **Image** → `MediaUploadInput` (kind=image) + `FocalPointPicker` overlay + Fit toggle
- **Video** → `MediaUploadInput` (kind=video) + poster upload + Fit toggle
- **Media overlays** (only when type is image/video):
  - Mode chips: None / Darken / Lighten / Custom Color (`ThemeAwareColorInput`)
  - Opacity slider 0–100%
  - Grain intensity slider 0–100% (SVG `feTurbulence` overlay)
  - Vignette slider 0–100% (radial-gradient edge darken)
  - Background blur slider 0–20px

Reuses existing primitives: `MediaUploadInput`, `ThemeAwareColorInput`, `SliderInput`, `FocalPointPicker`. No new uploaders.

---

### 3) New `SectionContainerEditor`

Same component as above, scoped to `container_*` keys, plus:
- "Enable container frame" toggle (off by default — back-compat with existing sections)
- Container max-width selector
- Inner padding slider (0–96px)
- Corner radius slider (0–48px)

---

### 4) Wire into `SectionStyleEditor`

Refactor `SectionStyleEditor.tsx` into three collapsible sub-blocks (using existing `EditorCard`):
1. **Section Background** — `<SectionBackgroundEditor scope="section" />`
2. **Container** — `<SectionContainerEditor />` (collapsed by default until enabled)
3. **Layout** — existing padding/max-width/radius/text-color/heading-scale/eyebrow controls

This keeps the public prop shape (`value: Partial<StyleOverrides>`, `onChange`) identical, so all 12+ section editors that already wire `SectionStyleEditor` get the new capabilities for free — no per-editor changes needed.

---

### 5) Render layers in `SectionStyleWrapper`

```text
<section [section-bg-color/gradient]>
  [if image/video bg] <div absolute media-layer with focal + fit + blur />
  [if media bg]       <div absolute scrim-layer (darken/lighten/color) />
  [if grain]          <div absolute grain-svg-layer />
  [if vignette]       <div absolute vignette-radial-layer />
  <div max-width-class>
    [if container]
      <div container-frame [bg/radius/padding]>
        [container media + overlays in same stack pattern]
        {children}
      </div>
    [else]
      {children}
  </div>
</section>
```

Z-order: media → scrim → grain → vignette → content. All overlay layers `pointer-events-none`.

---

### 6) Grain & vignette utilities

Add `src/lib/sectionOverlayLayers.ts`:
- `grainDataUri(intensity)` → inline SVG `feTurbulence` data-URI, opacity scaled by intensity
- `vignetteGradient(strength)` → `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${strength}) 100%)`

Both pure, zero dependencies, reusable in Hero too (future cleanup).

---

### 7) Back-compat & migration

- All new fields optional with safe defaults (`undefined` / `0` / `'none'`).
- Existing sections render identically (no container, no overlays) until operator opts in.
- No DB migration needed — fields nest into existing `style_overrides` JSON column.
- Hero keeps its dedicated `HeroBackgroundEditor` (slide-aware, more complex) — this new editor is for the other 12+ sections.

---

### Files

**New:**
- `src/components/dashboard/website-editor/inputs/SectionBackgroundEditor.tsx`
- `src/components/dashboard/website-editor/inputs/SectionContainerEditor.tsx`
- `src/lib/sectionOverlayLayers.ts`

**Edited:**
- `src/components/home/SectionStyleWrapper.tsx` — schema + multi-layer render
- `src/components/dashboard/website-editor/SectionStyleEditor.tsx` — compose new sub-editors
- `src/components/dashboard/website-editor/inputs/SectionBackgroundColorPicker.tsx` — extend or absorb

**No changes needed in 12+ section editors** — they already use `SectionStyleEditor`, so they inherit the new capabilities automatically.

---

### Out of scope (this wave)
- Hero gets these features later (its own editor is more complex with slides).
- Per-element media (e.g., card-level backgrounds inside a section) — separate future wave.
- Animated/parallax backgrounds — future.

Approve to implement.