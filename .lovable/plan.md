

## Problem

The editor preview layout (`Layout.tsx`, lines 98-109) only renders `Header`, `{children}`, and `FooterCTA` — but **not the `Footer` component**. So when clicking "Footer" in the site content sidebar, there's nothing to scroll to. Additionally, `'footer'` is missing from `TAB_TO_SECTION` and the `Footer` component has no `id="section-footer"`.

## Plan

### 1. Add Footer to editor preview layout
In `Layout.tsx` (line 106), add `<Footer />` after `<FooterCTA />` inside the editor preview branch so the footer is actually rendered in the iframe.

### 2. Add section ID to Footer component
In `Footer.tsx`, add `id="section-footer"` to the outermost `<footer>` element so the scroll-to-section mechanism can find it.

### 3. Add footer mapping to TAB_TO_SECTION
In `WebsiteSectionsHub.tsx`, add `'footer': 'footer'` to the `TAB_TO_SECTION` object so clicking "Footer" in the sidebar resolves to the correct section ID for scrolling.

