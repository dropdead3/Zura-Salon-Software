

## Problem

In `WebsiteSectionsHub.tsx` line 132, the `TAB_TO_SECTION` mapping has:
```
'footer-cta': 'new_client'
```
This maps the Footer CTA tab to the wrong section (`new_client` instead of `footer_cta`). Additionally, the `FooterCTA` component in `Layout.tsx` has no `id` attribute, so even with the correct mapping, `document.getElementById('section-footer_cta')` would find nothing.

## Plan

### 1. Fix TAB_TO_SECTION mapping
In `WebsiteSectionsHub.tsx` line 132, change `'footer-cta': 'new_client'` to `'footer-cta': 'footer_cta'`.

### 2. Add section ID to FooterCTA component
In `src/components/layout/FooterCTA.tsx`, add `id="section-footer_cta"` to the `<section>` element so the scroll-to-section mechanism can find it.

