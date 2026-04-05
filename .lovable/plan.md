

# Front-End Marketing Audit — Findings and Remediation Plan

## Executive Summary

The Zura marketing site is structurally sound — good section flow, grounded copy, functional components. But it reads as "well-built startup" rather than "premium product company." The issues are death-by-a-thousand-cuts: inconsistent spacing scales, over-reliance on violet gradients, redundant sections, bubbly radii in places, missing hover states, and responsive gaps. This plan addresses every finding.

---

## SECTION-BY-SECTION AUDIT

### 1. MarketingNav

**Issues:**
- CTA button uses gradient + shimmer animation — feels promotional, not premium
- "Sign In" has no visual weight; easy to miss
- No active-route indicator on nav links
- Mobile menu has no entrance animation on the container itself

**Improvements:**
- Replace gradient CTA with solid `bg-white text-slate-950` pill — confident, Stripe-style
- Add subtle underline or opacity shift for active route
- Mobile menu: add `motion.div` fade+slide for the container
- Sign In: keep ghost style but bump to `text-slate-300` for visibility

---

### 2. HeroSection

**Issues:**
- Gradient text ("clarity, not chaos") is the only color emphasis — overused pattern
- Pill badge shimmer animation is distracting; "Built with real salon owners" is weak social proof (no specificity)
- Trust line ("No credit card required") appears under CTAs but competes with the mockup spacing
- Two CTAs are equal visual weight — no clear primary hierarchy
- `mkt-fade-in` stagger uses 5 delays which makes load feel slow

**Improvements:**
- Remove gradient from headline text — use pure white with violet accent only on a single word or remove entirely. Let typography carry the weight
- Pill badge: remove shimmer, tighten copy to "Trusted by 50+ salon locations" (matches StatBar data)
- Reduce stagger to 3 groups max (headline, copy+CTAs, mockup)
- Primary CTA: solid white button (`bg-white text-slate-950`). Secondary: ghost border
- Remove trust line — it's repeated in FinalCTA and is weak here
- Add `lg:pt-40` for more breathing room on desktop

---

### 3. StatBar

**Issues:**
- 4 metrics on mobile collapse to 2x2 grid — fine, but "12 → 1" stat is confusing (what is "12 tools replaced by one system"?)
- `uppercase` on label text uses `font-sans` — violates design system (uppercase must be `font-display`)
- Counter animation duration (1400ms) is slightly long

**Improvements:**
- Fix the "12 → 1" stat: simplify to `12 → 1 / Tools Replaced` or remove — it's the weakest stat
- Change label `text-[10px] sm:text-xs text-slate-500 uppercase` to use `font-display` instead of `font-sans` when uppercase
- Reduce animation to 1000ms
- Add `font-display` to the trust line above stats

---

### 4. ProblemStatement

**Issues:**
- Left column headline + right column pain points creates an unbalanced 2-col layout — the right side has 6 items which is visually heavy
- Pain point titles use `font-display text-sm tracking-[0.1em]` which is extremely small for Termina — hard to read
- Icon containers use `rounded-xl` — inconsistent with the `rounded-lg` we adopted for the mega-menu
- The closing italic line in violet feels like a design orphan

**Improvements:**
- Reduce pain points from 6 to 4 (cut "Marketing feels like throwing darts" and "Training is chaos" — these are covered in SolutionShowcase)
- Bump pain point titles to `text-base`
- Standardize icon containers to `rounded-lg`
- Remove the closing italic line — it adds nothing and breaks the grid rhythm
- Left column: add a simple CTA link to `/product` — "See how Zura solves this →"

---

### 5. SolutionShowcase

**Issues:**
- 6 cards in a 3-col bento grid with varying `lg:col-span-2` / `lg:col-span-1` — the layout rhythm is unpredictable
- Category labels use `font-sans uppercase` — violates design system rule
- Each card has an "Explore →" link that all go to `/product` — repetitive and low-value
- Cards use `rounded-2xl` — should be `rounded-xl` per bento card system

**Improvements:**
- Reduce to 4 cards in a clean 2x2 grid — cut "Control Your Inventory" and "Everything Works Together" (covered by dedicated solution pages now)
- Remove per-card "Explore →" links — add a single section-level CTA: "See all solutions →" linking to the dropdown or `/product`
- Fix category labels: change to `font-display` when uppercase, or make them Title Case with `font-sans`
- Standardize to `rounded-xl`
- Remove `mkt-glass` hover effect — use border-highlight on hover instead (`hover:border-violet-500/20`)

---

### 6. PersonaExplorer

**Issues:**
- This is the strongest section on the page — interactive, purposeful, conversion-driving
- But the breadcrumb trail uses `text-muted-foreground` which is a dashboard theme token, not a marketing token (`text-slate-400/500` should be used)
- Problem chips wrap awkwardly on tablet widths (768–1024px) — too many options
- Solution card stat lines use italic — inconsistent with the grounded tone
- The "Ready to see it in action?" CTA at bottom is identical to FinalCTA — redundant

**Improvements:**
- Replace `text-muted-foreground` with `text-slate-500`
- Solution cards: remove italic from stat lines
- Remove the bottom CTA section from PersonaExplorer — let FinalCTA handle it
- Add subtle divider line before the section to separate it from SolutionShowcase

---

### 7. BuiltByOperators

**Issues:**
- The narrative is compelling but the credibility marker cards (right column) are generic — "80+ stylists managed" with a Users icon in a glass card doesn't feel credible
- The stat callout ("12 years of salon operations") uses `mkt-border-shimmer` which is overused across the page
- This section and the PersonaExplorer both establish credibility — consider if both are needed

**Improvements:**
- Keep the section but restructure the right column: replace 4 glass cards with a simple vertical stat list (no cards, just icon + text in a clean stack) — feels more editorial and less template-y
- Remove `mkt-border-shimmer` from the stat callout — use a simple border instead
- Tighten copy: remove "So we built what we wished existed" — it's assumed

---

### 8. OutcomeMetrics

**Issues:**
- 4 metrics but displayed in a 3-column grid — the 4th card sits alone on a second row, creating an orphan
- The metrics grid uses `sm:grid-cols-3` which means the 4th card wraps underneath as a full-width orphan on medium screens
- Cards use `mkt-border-shimmer` — combined with other sections using it, this animation is overused (Hero pill, BuiltByOperators callout, OutcomeMetrics cards, Demo form)
- `$84K` and `23%` are aspirational but unverified — could undermine trust

**Improvements:**
- Either reduce to 3 metrics (drop the weakest) or change to `grid-cols-2 sm:grid-cols-4` for proper 4-column layout
- Remove `mkt-border-shimmer` from these cards — let the stat animation carry the visual interest
- Add "Based on early adopter data" qualifier below the section header
- Standardize card radius to `rounded-xl`

---

### 9. TestimonialSection

**Issues:**
- Auto-rotating carousel (5s interval) is an anti-pattern — users may not read the full quote before it changes
- Only 3 testimonials — a carousel is unnecessary for 3 items
- The decorative `"` quote mark at 120px is visually dominant but adds clutter

**Improvements:**
- Replace carousel with a static display of all 3 testimonials in a clean column or 3-col grid
- Remove the oversized decorative quote mark
- Use a simpler horizontal rule or no decoration
- Each testimonial: blockquote + attribution in a minimal card

---

### 10. FinalCTA

**Issues:**
- Floating dot animation is a gimmick — 20 randomly placed animated dots feel dated
- "A better way to run your salon" headline is generic
- Two CTAs again (same as Hero) — no new information or urgency
- The gradient backdrop + blurred orb is heavy — combined with the global background effects in MarketingLayout, the bottom of the page feels over-produced

**Improvements:**
- Remove floating dots entirely
- Simplify to: headline, one sentence, one primary CTA button
- Kill the secondary "Explore the Platform" CTA — by this point, the user either wants a demo or doesn't
- Reduce background effects — keep the subtle gradient, remove the large blurred orb
- Headline: "See what clarity looks like." — more specific, more confident

---

### 11. MarketingFooter

**Issues:**
- "About" links to `/product` — this is wrong, should link to a proper about page or be removed
- Company column has only 2 links — feels sparse
- Footer feels adequate but not elevated

**Improvements:**
- Remove "About" link or point it to the BuiltByOperators anchor on the landing page
- Add "Solutions" link pointing to `/product` or the mega-menu trigger path
- Keep minimal — footer is fine as-is otherwise

---

### 12. DashboardMockup

**Issues:**
- The 4-phase animation (observe → detect → act → pause) is clever and differentiated — this is the best component on the page
- But the "APPLY" button in the lever card uses `font-display text-[9px]` which is illegible
- On mobile (< 640px), the 2-col KPI grid + lever card stack gets cramped

**Improvements:**
- Increase "APPLY" button text to `text-[10px]` minimum
- On mobile: hide the lever card entirely and let the KPIs + chart carry the mockup (the lever concept requires desktop space to land properly)

---

### 13. SolutionPageTemplate (all 7 solution pages)

**Issues:**
- Every page is identical in structure — no visual variety
- Problem/Solution cards all use same layout — after visiting 2 pages, the pattern is predictable
- No scroll-to-top on page navigation
- Cards use `rounded-2xl` — should be `rounded-xl`

**Improvements:**
- Add `window.scrollTo(0, 0)` on mount via useEffect in the template
- Standardize to `rounded-xl`
- Alternate card layout: odd-indexed pages could use a horizontal card layout vs. vertical — minor variation to break monotony

---

### 14. SolutionsMegaMenu

**Issues:**
- The backdrop overlay + viewport positioning from the last iteration is solid
- But the `transform: translateX(calc(-50% + ${offsetX}px))` approach fights with framer-motion's own transform — potential jank
- The bottom CTA bar ("Not sure where to start?") is good conversion insurance

**Improvements:**
- Use `left` style positioning instead of `transform` for the horizontal offset to avoid transform conflicts with framer-motion
- Keep everything else — this component is clean

---

## GLOBAL IMPROVEMENTS

### Spacing Standardization
Define and enforce a spacing scale across all marketing sections:
- Section vertical padding: `py-20 lg:py-28` (standardize — currently ranges from `py-12` to `py-40`)
- Section max-width: `max-w-5xl` for content, `max-w-6xl` for grids (currently inconsistent: 3xl, 4xl, 5xl, 6xl used)
- Inner spacing: `gap-4` for card grids, `gap-6` for content blocks

### Border Radius Standardization
- All marketing cards: `rounded-xl` (not `rounded-2xl`)
- Icon containers: `rounded-lg`
- Buttons: `rounded-full` (already consistent)
- Mega-menu: `rounded-lg` (already done)

### Animation Restraint
- Remove `mkt-border-shimmer` from all uses except the Hero pill badge (one location only)
- Remove `mkt-cta-shimmer` from nav CTA
- Remove floating dots from FinalCTA
- Keep: scroll reveal, counter animations, dashboard mockup phases, mega-menu transitions

### Color Restraint
- CTA buttons: primary = solid white (`bg-white text-slate-950`), secondary = ghost border — no gradients
- Remove `from-violet-600 to-purple-600` gradient from ALL buttons site-wide
- Violet remains the accent color but only for icons, labels, and subtle highlights — not button fills

### Typography Compliance
- Every `uppercase` instance must use `font-display` — audit and fix all `font-sans uppercase` violations
- Section eyebrow labels: standardize to `font-display text-[11px] tracking-[0.15em] text-violet-400 uppercase`

### Responsive Fixes
- Test all sections at 768px, 1024px, 1280px, 1440px breakpoints
- OutcomeMetrics: fix orphan 4th card
- ProblemStatement: pain points stack properly on tablet
- FinalCTA: single CTA on mobile — no side-by-side buttons

---

## FILE CHANGES SUMMARY

| File | Action | Key Changes |
|------|--------|-------------|
| `MarketingNav.tsx` | Modify | Solid white CTA, remove shimmer, active route indicator |
| `HeroSection.tsx` | Modify | Remove gradient text, solid white primary CTA, cut trust line, reduce stagger |
| `StatBar.tsx` | Modify | Fix font-display on uppercase labels, simplify "12→1" stat, faster animation |
| `ProblemStatement.tsx` | Modify | Cut to 4 pain points, bump title size, standardize radii, remove closing italic |
| `SolutionShowcase.tsx` | Modify | Cut to 4 cards in 2x2, fix uppercase violations, remove per-card links, standardize radii |
| `PersonaExplorer.tsx` | Modify | Fix theme token leak, remove bottom CTA, remove italic from stats |
| `BuiltByOperators.tsx` | Modify | Restructure right column to stat list, remove shimmer, tighten copy |
| `OutcomeMetrics.tsx` | Modify | Fix grid to 4-col or cut to 3, remove shimmer, add qualifier, fix radii |
| `TestimonialSection.tsx` | Modify | Replace carousel with static grid, remove decorative quote mark |
| `FinalCTA.tsx` | Modify | Remove floating dots + blurred orb, single CTA, tighter headline |
| `DashboardMockup.tsx` | Modify | Fix APPLY button legibility, hide lever card on mobile |
| `MarketingFooter.tsx` | Modify | Fix "About" link, add Solutions link |
| `SolutionPageTemplate.tsx` | Modify | Add scroll-to-top, standardize radii |
| `SolutionsMegaMenu.tsx` | Modify | Fix transform conflict with positioning |
| `index.css` | Modify | Remove `mkt-float-dot` keyframes, reduce shimmer usage |

**0 new files. 15 files modified. 0 files deleted.**

---

## QUALITY STANDARD

After these changes, the site should feel like:
- **Stripe's product pages**: confident typography, restrained color, generous space
- **Linear's marketing**: clean grids, purposeful animation, no fluff
- **Apple's product sections**: let the content breathe, hierarchy through scale not decoration

What gets removed is as important as what stays.

