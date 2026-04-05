

# Marketing Front-End — Continued Improvements & Fixes

## Issues Found

### Critical Bugs
1. **`/about` route is missing** — The About page was rebuilt with `MarketingLayout` but has no top-level route in `App.tsx`. It only exists under `/org/:orgSlug/about` (tenant-scoped). The footer links to `/about` which 404s.
2. **Footer "Company" column is anemic** — Only has "Sign In". Missing "About", "Blog", "Careers" links. The About link is the most obvious omission since the page exists.
3. **Footer "Solutions" link points to `/product`** — Should link to the solutions mega menu or a dedicated `/solutions` index page, not the product page.

### UI Polish Issues
4. **LogoBar and StatBar render back-to-back borders** — Both sections have `border-y border-white/[0.06]`, creating a double-border seam between them on the landing page.
5. **Testimonial cards lack visual differentiation** — All three cards are identical white/[0.02] boxes. No accent, no gradient, no variety. The "Owner Stories" eyebrow is orphaned with no headline below it.
6. **FinalCTA section feels thin** — Just a headline, one line of body text, and a button. No supporting visual, no secondary CTA, no trust signal. Compared to the rest of the page it's underwhelming as the closing pitch.
7. **"See all solutions" link at bottom of SolutionShowcase** — Small plain text link. Should be a ghost button for better tap target and visual weight.
8. **PersonaExplorer taglines use `font-serif italic`** — These serif italic lines feel out of place against the otherwise Termina + Aeonik system. Should use `font-sans` or `font-display` for consistency.
9. **BuiltByOperators credibility markers** — The right column only has 3 markers visible (the "80+ stylists managed" marker is scrolled off in the screenshot). The markers are plain text with no stat emphasis — the numbers should pop more.

### Missing Pages / Navigation
10. **No `/about` route** — needs to be added to the router alongside the other standalone public pages.
11. **Footer Company column** — needs About link added.

---

## Plan

### 1. Add `/about` route to router
Add a top-level `<Route path="/about">` in `App.tsx` alongside `/pricing`, `/demo`, etc. Import the existing `About` page component.

**File:** `src/App.tsx`

### 2. Fix footer links
- Add "About" to the Company column
- Change "Solutions" href from `/product` to a more appropriate target (keep `/product` label as "Platform", add a proper "Solutions" link to one of the solution pages or keep as-is since the mega menu handles it)

**File:** `src/components/marketing/MarketingFooter.tsx`

### 3. Fix double-border between StatBar and LogoBar
Remove the `border-y` from `LogoBar` (or just `border-t`) since `StatBar` already provides the bottom border.

**File:** `src/components/marketing/LogoBar.tsx`

### 4. Elevate TestimonialSection
- Add a proper headline below the "Owner Stories" eyebrow: "What operators are saying"
- Add a subtle left-border accent to each testimonial card (violet gradient border) for visual differentiation
- Use alternating accent colors from the palette for variety

**File:** `src/components/marketing/TestimonialSection.tsx`

### 5. Strengthen FinalCTA
- Add a secondary line of supporting text or a trust signal ("Join 50+ salon locations already using Zura")
- Add a secondary ghost CTA ("Explore the Platform") below the primary
- Add a subtle gradient text accent on the headline

**File:** `src/components/marketing/FinalCTA.tsx`

### 6. Upgrade "See all solutions" to ghost button
Replace the plain text link with a proper ghost-styled button using the lavender border variant.

**File:** `src/components/marketing/SolutionShowcase.tsx`

### 7. Fix PersonaExplorer font inconsistency
Replace `font-serif italic` on persona taglines with `font-sans text-sm text-slate-400` for consistency with the rest of the marketing system.

**File:** `src/components/marketing/PersonaExplorer.tsx`

### 8. Polish BuiltByOperators markers
Make the stat numbers in the marker text use `text-[hsl(var(--mkt-lavender))]` or `text-white` for emphasis, separating the number from the label text.

**File:** `src/components/marketing/BuiltByOperators.tsx`

---

## Summary

| File | Change |
|------|--------|
| `App.tsx` | Add `/about` route |
| `MarketingFooter.tsx` | Add About link to Company column |
| `LogoBar.tsx` | Remove top border to fix double-border seam |
| `TestimonialSection.tsx` | Add headline, accent borders on cards |
| `FinalCTA.tsx` | Add trust signal, secondary CTA, gradient headline accent |
| `SolutionShowcase.tsx` | Upgrade "See all solutions" to ghost button |
| `PersonaExplorer.tsx` | Fix serif italic to sans for consistency |
| `BuiltByOperators.tsx` | Emphasize stat numbers in markers |

**8 files modified. 0 new. 0 deleted.**

