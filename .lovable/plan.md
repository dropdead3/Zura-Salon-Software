## Brand Logos editor — UX + functional refresh

Scope: `src/components/dashboard/website-editor/BrandsManager.tsx` + the live `src/components/home/BrandsSection.tsx`. Three problems to fix and one new capability to add.

### Problems observed

1. **Delete button is clipped on the right** (visible in your screenshot — the trash icon sits past the card's right edge). The `SortableBrandItem` row uses `flex items-start gap-3` with the trash `<Button>` as the last flex child but the card itself has no padding budget for it, and on narrower editor widths it overflows.
2. **Upload accepts any image type**, with no nudge toward SVG (the only format that scales cleanly in the marquee).
3. **No way to resize an uploaded logo** — uploaded images render at a fixed `w-16 h-16` thumbnail in the editor, and the live site doesn't render uploaded logos at all today (the marquee only renders `display_text`). So uploads currently have zero public effect.

### What ships

**1. Layout fix for the row (no more clipped delete)**

Restructure `SortableBrandItem` so the delete button is always visible and the controls stack predictably at narrow widths:

```text
[grip] [logo tile]  [Brand Name input             ]  [trash]
                    [Display Text input           ]
                    [Upload / Size controls       ]
```

- Wrap the row in a stable grid: `grid grid-cols-[auto_auto_1fr_auto] gap-3` so the trash column always reserves space.
- Drop `mt-2` magic spacing on the trash button; align it to the top row with `self-start`.
- Add `min-w-0` on the form column so long brand names don't push the trash off-screen.

**2. SVG-preferred optional upload + helper copy**

- The upload button stays optional and gets a clearer label: **"Upload Logo (SVG recommended)"**.
- File input switches to `accept=".svg,image/svg+xml,image/png,image/webp"` — SVG listed first so the OS file picker defaults to it.
- Add an inline helper line under the Brand Logos card description:
  > **Easiest path:** leave logos empty and just fill **Display Text**. Text-only marquees stay perfectly cohesive across every brand. Upload an SVG only if you want the actual logo mark.
- On non-SVG upload, show a soft warning toast: *"PNG accepted. SVG scales cleaner — consider replacing later."* (No hard block — operators may not have an SVG yet.)

**3. Per-brand logo size control**

Add `logo_height_px?: number` to the `Brand` type (default 32, range 16–64). Renders only when `logo_url` is set:

```text
[Logo height]  [— slider 16–64 —]  32px
```

- Editor: small `SliderInput` rendered under the Display Text field, only when `brand.logo_url` is truthy.
- Live `BrandsSection` (currently text-only): when `show_logos` is true AND `brand.logo_url` exists, render the logo as `<img>` at `height: {logo_height_px}px width:auto` next to (or instead of, depending on text presence) the display text inside the same marquee item. Falls back to text when no logo URL exists. This is the bit that finally makes the upload do something on the public site — without it the new size slider would be cosmetic.

**4. Display-Text-first guidance in the empty/sparse state**

When a brand row has no logo URL, the upload CTA loses prominence: smaller `ghost` button instead of `outline`, with the helper line "Optional — text alone looks great."

### Technical details

Files changed:
- `src/hooks/useSectionConfig.ts` — extend `Brand` interface with optional `logo_height_px?: number`. Add to `DEFAULT_BRANDS` brand seeds (omitted = use renderer default 32).
- `src/components/dashboard/website-editor/BrandsManager.tsx`:
  - Restructure `SortableBrandItem` layout (grid + `min-w-0` + `self-start` trash).
  - Update file input `accept` and CTA copy.
  - Add `SliderInput` for `logo_height_px` (16–64, step 2, unit "px"), gated on `brand.logo_url`.
  - Add helper paragraph under the "Brand Logos" `EditorCard` description.
  - SVG-preference toast on non-SVG uploads.
- `src/components/home/BrandsSection.tsx`:
  - When `config.show_logos && brand.logo_url`, render `<img src={brand.logo_url} alt={brand.name} style={{ height: brand.logo_height_px ?? 32 }} className="w-auto inline-block align-middle" />` inside the marquee item, replacing or alongside the text per existing layout. Both sets (live + duplicated) get the same treatment to keep the loop seamless.

No DB migration — `Brand` lives inside the JSON `value` of the existing `section_brands` site_setting, and the new field is optional.

### Out of scope

- Logo color/inversion controls (dark vs light marquee). Can be a follow-up if operators ship dark-background brand logos.
- Cropping / focal-point — SVG doesn't need it; raster fallback is intentionally bare.
- Bulk SVG conversion. We nudge but don't block.
