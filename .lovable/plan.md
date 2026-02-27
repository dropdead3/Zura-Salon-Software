

## Fix Canvas Preview: Hero Invisible + Scroll Issues

### Root Cause Analysis

**Problem 1 — Hero content is invisible in preview.** The `HeroSection` has multiple framer-motion elements with `initial={{ opacity: 0, ... }}` entrance animations. While `animDelay` was set to 0 in preview mode, the spring transitions still take noticeable time. More critically, the main content wrapper at line 139-141 has `style={{ opacity }}` bound to `useScroll({ target: sectionRef })` — inside the small iframe viewport, this scroll-based opacity may resolve incorrectly, making the entire hero invisible.

**Problem 2 — Parallax transforms break inside iframe.** The `useScroll`/`useTransform` hooks create parallax effects (taglineY, headlineY, blur, etc.) that depend on the section being inside a full-height scrollable viewport. Inside the editor iframe, these transforms produce unexpected offsets and opacity values.

### Changes

**File 1 — `src/components/home/HeroSection.tsx`**

When `isPreview` is true:
- Set all `initial` props to `false` on every `motion.*` element (skips entrance animations entirely — content appears immediately)
- Disable the scroll-based `style` bindings (`opacity`, `y` parallax transforms, blur filters) by conditionally passing `undefined` instead of the `useTransform` values
- This means: no entrance fade-in, no parallax, no scroll-blur — just static visible content in preview

Specifically:
- Line 141: `style={{ opacity }}` → `style={isPreview ? undefined : { opacity }}`
- Lines 146-149: `initial={isPreview ? false : { opacity: 0, y: 30, filter: "blur(10px)" }}` (and remove the `style={{ y: taglineY }}` in preview)
- Same pattern for all other motion elements (headline spans at ~162-176, subheadline at ~197, CTA divs at ~215-245, scroll indicator at ~257)
- Lines 160, 167, 176: conditional `style` for parallax `y`, `x`, `opacity`, `filter` transforms

**File 2 — `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`**

No changes needed for scrolling — the iframe scrolls natively. The "stuck" appearance was caused by the hero being invisible (opacity 0), making it look like the page started at the FooterCTA.

### Result

Hero content will appear immediately and fully visible in the editor canvas. The page will scroll normally because the hero section will have visible content at the top. All parallax/blur effects remain intact on the public site.

