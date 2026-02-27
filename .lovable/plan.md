

## Problem Diagnosis

The "broken apart" look has two root causes:

1. **Footer reveal layout bleeding into the editor iframe**: In Preview (view) mode, `Layout.tsx` falls through to the public-site path which applies `rounded-b-[2rem]`, `shadow-[0_30px_60px]`, `overflow-hidden`, and `marginBottom: footerHeight`. Inside the editor iframe, this creates visible card-like breaks and clipping.

2. **Scroll-based opacity animations stuck at 0**: `BrandStatement`, `FooterCTA`, and other sections use `useScroll` + `useTransform` to animate opacity from 0 → 1 on scroll. Inside the constrained iframe, scroll progress never advances, so these sections render as invisible empty gaps — creating the "broken apart" appearance with visible divisions between blank areas.

## Plan

### 1. Fix Layout.tsx — disable footer reveal for ALL editor iframe modes
Currently `getIsEditorPreview()` only checks `params.has('preview')`. The simplified layout branch (`isEditorPreview && !isViewMode`) excludes view mode, pushing it into the footer-reveal path. Change the condition so both edit AND view modes inside the editor iframe use the simplified layout (no `rounded-b`, no `marginBottom`, no fixed footer, no `PageTransition`).

### 2. Fix BrandStatement — bypass scroll-based opacity in preview
The `useScroll`/`useTransform` on the outer `motion.div` (opacity, blur, y) starts at 0 and never progresses. Add an `isPreview` check (detect iframe via URL params) and force `style={{ opacity: 1, filter: 'none', y: 0 }}` when in the editor.

### 3. Fix FooterCTA — bypass scroll-based opacity in preview  
Same issue: 6+ scroll-linked opacity transforms all start at 0. Add iframe detection and force all content to full visibility when rendered inside the editor.

### 4. Audit remaining scroll-animated sections
Check `NewClientSection`, `GallerySection`, `ServicesPreview`, `TestimonialSection`, and `FAQSection` for the same `useScroll`/`useTransform` opacity pattern. Apply the same forced-visibility fix to any that use it.

### Technical Detail

Detection approach — use URL params evaluated at render time:
```ts
function getIsEditorContext() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('preview') || params.has('mode');
}
```

This is already used in `PageSectionRenderer.tsx` as `getIsEditorPreview()`. The same check will be applied in `Layout.tsx` (replacing the narrower `params.has('preview')` check) and passed as props or evaluated locally in scroll-animated sections.

