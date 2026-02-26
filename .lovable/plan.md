

## Diagnosis: Editor Preview Rendering Issues

### What I Found

I navigated to the Website Editor and observed the live preview iframe. After the initial load (which took a few seconds), the site **does render** -- I can see the announcement bar, navigation header, and sections like "Book Your Consult." However, there are two distinct problems:

### Problem 1: Full-Bleed Sections Are Constrained

The `PageSectionRenderer` wraps the editor preview in:
```
<div className="zura-editor-preview px-4 sm:px-6 lg:px-8 py-6 space-y-0">
```

This adds horizontal padding (`px-4` to `px-8`) that **constrains sections designed to be full-width/full-bleed** (Hero, Gallery, etc.). The Hero section, for example, uses `min-h-screen` or large viewport-relative heights with absolute positioning -- when wrapped in padding + a bento card with `p-6 sm:p-7 lg:p-8` internal padding, it either:
- Gets cropped or collapses in height
- Loses its full-bleed visual
- Appears broken or missing

The `EditorSectionCard` wrapper itself adds another layer of padding and `overflow: hidden` via `rounded-[20px]`, which clips content that relies on extending beyond its container.

### Problem 2: The Sticky Nav IS Present

Looking at the screenshot, the Header (DD logo, Services, About, etc.) **is** rendering. It's part of `Layout.tsx`, which wraps `PageSectionRenderer`. The sticky behavior may appear broken because:
1. The `Layout.tsx` forces `theme-cream` and removes dark mode -- this is fine
2. The iframe loads the full page including `Layout > Header > PageSectionRenderer`, so the nav should work
3. But the `zura-editor-preview` padding creates a gap that makes it look different from the actual site

### Root Cause

The editor preview wrapper (`zura-editor-preview` class + `EditorSectionCard` padding) was designed for a card-layout aesthetic but **conflicts with full-bleed section components** that expect to fill 100% width with no parent padding. The sections weren't built to render inside constrained padded containers.

### Fix

The fix needs to handle the tension between "floating bento cards" (which need padding/radius) and "full-bleed sections" (which need edge-to-edge rendering). The solution:

1. **Remove outer horizontal padding from `zura-editor-preview`** -- let the bento cards extend to the iframe edges. The iframe itself already provides the boundary.

2. **Make `EditorSectionCard` use `overflow-visible` instead of clipping** -- allow section content to render naturally within the card, with the card chrome (header controls, selection ring) as a visual overlay rather than a constraining box.

3. **For full-bleed sections (hero, gallery, etc.), use `p-0` padding on the card** and only show the bento card header/controls as an overlay. The card border/shadow provides visual separation without constraining the content.

4. **Add a `fullBleed` flag** to `EditorSectionCard` for sections that are known full-width (hero, gallery, new_client, etc.) -- these get `p-0 overflow-hidden rounded-[20px]` (clip at the rounded corners only, no internal padding).

### Files to Change

| File | Change |
|---|---|
| `src/components/home/PageSectionRenderer.tsx` | Remove outer `px-*` padding from `zura-editor-preview`. Pass `fullBleed` prop to `EditorSectionCard` for full-bleed section types. Add vertical spacing between cards via `space-y-5` or `gap-5`. |
| `src/components/home/EditorSectionCard.tsx` | Accept `fullBleed` boolean prop. When true: use `p-0 overflow-hidden` instead of `p-6 sm:p-7 lg:p-8`. Always keep `rounded-[20px]` and the hover header overlay. |

Two files. Targeted fix that preserves the bento card aesthetic while letting full-bleed sections render correctly.

### Full-Bleed Section Types

These section types should get `fullBleed={true}`:
- `hero`
- `gallery`
- `new_client`
- `brand_statement`
- `extensions`

All other sections (services_preview, popular_services, testimonials, faq, stylists, locations, brands, drink_menu) render fine with card padding.

