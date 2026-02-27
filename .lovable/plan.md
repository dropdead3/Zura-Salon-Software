

## Fix Canvas Preview Scroll-to-Section

Two root causes identified and confirmed via browser testing:

### Problem 1: Incomplete `TAB_TO_SECTION` mapping

The SITE CONTENT items use tab keys like `'testimonials'`, `'gallery'`, `'stylists'`, `'locations'` — but `TAB_TO_SECTION` in `WebsiteSectionsHub.tsx` only maps the `-section` suffixed variants (`'testimonials-section'`, `'gallery-section'`, etc.). When clicking a SITE CONTENT item, `activeSectionId` resolves to `undefined`, so no scroll message is sent.

**Fix — `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`** (lines 114-128):

Add the missing SITE CONTENT tab keys to `TAB_TO_SECTION`:

```ts
const TAB_TO_SECTION: Record<string, string> = {
  'hero': 'hero',
  'brand': 'brand_statement',
  'testimonials-section': 'testimonials',
  'testimonials': 'testimonials',          // SITE CONTENT tab
  'services-preview': 'services_preview',
  'popular-services': 'popular_services',
  'gallery-section': 'gallery',
  'gallery': 'gallery',                    // SITE CONTENT tab
  'new-client': 'new_client',
  'stylists-section': 'stylists',
  'stylists': 'stylists',                  // SITE CONTENT tab
  'locations-section': 'locations',
  'locations': 'locations',                // SITE CONTENT tab
  'faq': 'faq',
  'extensions': 'extensions',
  'brands': 'brands',
  'drinks': 'drink_menu',
  'footer-cta': 'new_client',              // Footer CTA maps to new_client section
};
```

### Problem 2: Re-selecting same section doesn't re-scroll

When `activeSectionId` stays the same (e.g., clicking the same section again), the `useEffect` in `CanvasPanel` doesn't re-fire. The fix is to include a counter or use a callback pattern.

**Fix — `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**:

Add a `scrollCounter` state that increments on every tab change, and pass it alongside `activeSectionId` so the effect always re-fires.

**Fix — `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`**:

Accept an optional `scrollTrigger` prop (a counter). Include it in the `useEffect` dependency array so it re-fires even when the sectionId is the same.

### Single-file summary

Two files modified:
1. `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — expand `TAB_TO_SECTION`, add scroll counter
2. `src/components/dashboard/website-editor/panels/CanvasPanel.tsx` — accept `scrollTrigger` prop, include in effect deps

