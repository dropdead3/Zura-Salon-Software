

## Problem

The editor preview layout (lines 98-110 in `Layout.tsx`) renders `FooterCTA` and `Footer` inline with no parallax reveal effect. The public site layout (lines 115-142) uses a fixed-position footer with the main content container scrolling over it, creating the parallax reveal. The editor preview should replicate this behavior.

## Plan

### 1. Update editor preview branch in Layout.tsx to use footer reveal pattern

Replace the simplified editor preview layout (lines 98-110) with the same fixed-footer + scrolling-content-over-it pattern used by the public site. This means:

- Add a fixed `Footer` at the bottom (z-0)
- Wrap `Header`, `main`, and `FooterCTA` in a scrolling container (z-10) with `rounded-b-[2rem]`, `shadow`, and `marginBottom: footerHeight`
- The `Footer` sits behind and is revealed as the user scrolls past the CTA

The key difference from the public site branch: skip `PageTransition`, skip `StickyFooterBar`, and skip the `showFooter` opacity toggle (keep footer always visible in editor so the scroll-to-section works immediately).

### 2. Ensure scroll/resize hooks run in editor mode

Currently the `footerHeight` measurement hooks (lines 73-95) and `showFooter` scroll handler (lines 61-71) run regardless of mode, but the editor branch at line 98 returns early before they take effect. Since both branches will now share the same pattern, move the early return below the hooks or restructure so the editor branch uses `footerRef` and `footerHeight`.

**Net result**: Clicking "Footer" in site content scrolls the iframe, the CTA slides up and the footer is revealed underneath — identical parallax effect to the public site.

