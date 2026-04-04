

# Zura Platform Front-End: Strategic Rebuild Plan

---

## PART 1: STRATEGIC DIAGNOSIS

### The Problem
The current `PlatformLanding.tsx` is a placeholder -- 150 lines of generic "salon management platform" copy with six feature cards. It communicates nothing about Zura's actual value proposition: governance infrastructure for scaling operators. The current page would lose every enterprise prospect at first glance.

### Why Most SaaS Sites Fail at Communicating Complex Systems
1. **Feature soup** -- listing capabilities instead of framing outcomes
2. **Persona blindness** -- speaking to everyone, resonating with no one
3. **No progressive disclosure** -- dumping complexity on first contact
4. **Generic positioning** -- "all-in-one platform" is not a category
5. **No proof architecture** -- claims without evidence structure

### What Actually Drives Conversion for a Platform Like Zura
- **Category clarity in 5 seconds** -- visitor knows this is NOT basic salon software
- **Outcome framing** -- "see which lever to pull next" beats "analytics dashboard"
- **Social proof density** -- logos, metrics, testimonials layered throughout
- **Friction-appropriate CTAs** -- demo request (high intent) vs explore (low intent)
- **Authority signals** -- the site itself must feel like infrastructure

### Risks of Poor Architecture
- Style leakage into tenant websites (organization-owned front-ends)
- Marketing CSS overriding dashboard tokens
- Login UX feeling disconnected from the premium marketing surface
- Shared component updates breaking live tenant experiences

---

## PART 2: FRONT-END ARCHITECTURE AND CONVERSION PLAN

### Audience Architecture
| Tier | Persona | Entry Point | Primary CTA |
|------|---------|-------------|-------------|
| Primary | Multi-location owner / scaling operator | Homepage hero | Request Demo |
| Secondary | Salon owner (single location, growth-ready) | Homepage / Product pages | Request Demo |
| Tertiary | Enterprise executive / investor | Ecosystem page | Contact Sales |
| Existing | Current Zura user | Direct /login | Sign In |

### Messaging Architecture
**Hierarchy:**
1. **Category claim**: "The Operating System for Scaling Salon Businesses"
2. **Problem frame**: "Operational chaos costs you margin, talent, and growth"
3. **Solution frame**: "Zura tells you exactly which lever to pull next"
4. **Proof**: Metrics, logos, testimonials
5. **Ecosystem**: Intelligence Brief, Marketing OS, Simulation Engine, Automation

**Tone**: Advisory. Confident. Precise. Never pleading. Never generic.

### Information Architecture

```text
/                    → Homepage (conversion-optimized)
/product             → Platform deep-dive (Intelligence, Operations, Team, Marketing)
/ecosystem           → Ecosystem overview (Brief, Marketing OS, Simulation, Automation)
/pricing             → Pricing (future, placeholder for now)
/login               → Unified login (existing, restyled)
/demo                → Demo request (existing route, enhanced)
```

### Homepage Framework (Section Order)
1. **Navigation bar** -- Logo, Product, Ecosystem, Pricing, Login, "Request Demo" CTA
2. **Hero** -- Category claim + sub-headline + dual CTA (Demo / Explore Platform)
3. **Logo bar** -- "Trusted by operators running $X in annual revenue"
4. **Problem statement** -- 3-column grid: the cost of operational chaos
5. **Platform preview** -- Full-width product screenshot/mockup with annotation overlay
6. **Intelligence pillars** -- 4 pillars: Observe, Compare, Detect, Recommend
7. **Outcome metrics** -- Large stat counters (margin improvement, time saved, drift reduction)
8. **Ecosystem preview** -- 4 cards linking to ecosystem surfaces
9. **Testimonial** -- Single high-impact quote from a scaling operator
10. **Final CTA** -- "See Zura in action" + demo request form
11. **Footer** -- Minimal: links, legal, platform branding

### Login UX Strategy
The existing `UnifiedLogin.tsx` (858 lines) is functionally complete with dual-role detection, invitation flows, and proper redirect logic. The rebuild will:
- Restyle the login surface to match marketing visual language (dark mode, violet accents)
- Keep it architecturally isolated (it already renders outside `PrivateAppShell`)
- Add a subtle "← Back to home" link
- Preserve all existing auth logic untouched

### Visual Direction
- **Palette**: Slate-950 base, violet-500/600 primary accent (matches existing `--platform-primary`)
- **Typography**: Termina (font-display) for headlines, Aeonik Pro (font-sans) for body -- consistent with existing token system
- **Motion**: Subtle fade-in on scroll, no aggressive animations
- **Imagery**: Dark UI screenshots with violet glow overlays, not stock photos
- **Grid**: 12-column, 1280px max-width content, 80px section padding

### Trust System
- Logo bar (organizations using Zura)
- Metric counters (aggregate platform stats)
- Single testimonial (quality over quantity)
- "Built for operators running $1M–$10M+" positioning signal

### Conversion Paths
1. **Primary**: Hero CTA → Demo request form (inline or /demo page)
2. **Secondary**: Ecosystem card → Product deep-dive → Demo CTA
3. **Existing user**: Nav "Sign In" → /login → Dashboard redirect

### Responsive Behavior
- **Desktop (1280+)**: Full 12-column grid, side-by-side layouts
- **Laptop (1024-1279)**: Maintain grid, reduce section padding to 60px
- **Tablet (768-1023)**: 2-column grids collapse to single, hero text scales to text-4xl
- **Mobile (< 768)**: Single column, hamburger nav, full-width CTAs, stacked cards

### Brand Tone
Every line of copy must pass this test: "Would a $10M operator take this seriously?"
- No: "Run your salon smarter"
- Yes: "The operating system for scaling salon businesses"

---

## PART 3: PLATFORM BOUNDARY PROTECTION PLAN

### Scope Definition
| Layer | In Scope | Out of Scope |
|-------|----------|--------------|
| Marketing (`/`, `/product`, `/ecosystem`) | YES - full rebuild | |
| Auth (`/login`) | RESTYLE ONLY - no logic changes | |
| App (`/org/:slug/dashboard/*`) | | OUT OF SCOPE |
| Platform Admin (`/platform/*`) | | OUT OF SCOPE |
| Tenant websites (`/org/:slug/*` public) | | OUT OF SCOPE |

### Isolation Strategy

**CSS Isolation:**
- All marketing page styles will be scoped inside a `.marketing-surface` container class
- New CSS variables will be namespaced as `--marketing-*` in `index.css`, scoped to `.marketing-surface`
- No modification to existing `.platform-theme`, `.platform-dark`, `.platform-light` classes
- No modification to existing design tokens (`src/lib/design-tokens.ts`)

**Component Isolation:**
- New marketing components live in `src/components/marketing/` -- entirely separate from `src/components/platform/`, `src/components/dashboard/`, and tenant components
- Marketing components import from `src/lib/brand.ts` for platform identity tokens
- No shared mutable state between marketing and app layers

**Route Isolation:**
- Marketing pages render outside `PrivateAppShell` (already the case for `/` and `/login`)
- No `OrganizationProvider` dependency on marketing pages
- Marketing layout wrapper (`MarketingLayout`) is distinct from `PlatformLayout` and `DashboardLayout`

**Login Bridge:**
- Login page already renders outside the private provider tree
- Visual restyling uses the same `.marketing-surface` CSS scope
- Auth logic in `UnifiedLogin.tsx` remains completely untouched
- The transition from marketing → login → dashboard is a route change, not a UI merge

**Regression Prevention:**
- Zero changes to any file in `src/components/dashboard/`, `src/components/platform/`, `src/components/org/`
- Zero changes to `src/lib/design-tokens.ts`
- Zero changes to existing CSS variable blocks in `index.css`
- New CSS is additive only (appended, never replacing existing rules)

---

## PART 4: HIGH-FIDELITY WIREFRAME AND UI DIRECTION

### Navigation Bar
```text
┌────────────────────────────────────────────────────────────────┐
│ [Z Logo]  ZURA     Product   Ecosystem   Pricing    Sign In  │
│                                                  [Request Demo]│
└────────────────────────────────────────────────────────────────┘
```
- **Behavior**: Fixed top, bg-transparent initially, bg-slate-950/80 backdrop-blur-xl on scroll (>80px)
- **Mobile**: Hamburger icon, slide-in overlay panel, CTA stays visible
- **Logo**: `PlatformLogo variant="landing"` (existing component)
- **CTA button**: Violet-600 fill, rounded-lg, h-10 px-6, font-sans font-medium text-sm
- **Nav links**: text-slate-400, hover:text-white, font-sans text-sm, tracking-wide

### Hero Section
```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│              [Pill badge: "Intelligence Infrastructure"]       │
│                                                                │
│         The Operating System for                               │
│         Scaling Salon Businesses                               │
│                                                                │
│    Zura eliminates operational chaos by embedding structure     │
│    into workflows and surfacing the exact lever to pull next.  │
│                                                                │
│         [Request Demo]    [Explore Platform →]                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
- **Headline**: font-display text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight, "Scaling Salon Businesses" in violet gradient
- **Sub**: font-sans text-lg sm:text-xl text-slate-400, max-w-2xl, leading-relaxed
- **Pill badge**: bg-violet-500/10 border border-violet-500/20 rounded-full, text-violet-300 text-sm
- **Primary CTA**: bg-gradient violet-600→purple-600, rounded-xl, shadow-lg shadow-violet-500/25, h-12 px-8
- **Secondary CTA**: bg-white/5 border border-white/10, rounded-xl, h-12 px-8
- **Background**: Inherited grid pattern + violet/purple radial blurs (existing pattern)
- **Responsive**: text-4xl on tablet, text-3xl on mobile; CTAs stack vertically on mobile (full-width)

### Logo Bar
```text
┌────────────────────────────────────────────────────────────────┐
│  Trusted by operators managing $XX million in annual revenue   │
│  [Logo] [Logo] [Logo] [Logo] [Logo] [Logo]                    │
└────────────────────────────────────────────────────────────────┘
```
- Logos: grayscale, opacity-40, hover:opacity-80 transition
- Container: py-16, border-y border-white/[0.06]
- Text: font-sans text-sm text-slate-500 uppercase tracking-[0.15em] mb-8
- Mobile: logos wrap to 2 rows of 3, centered

### Problem Statement (3 columns)
```text
┌──────────────────┬──────────────────┬──────────────────┐
│  Margin Erosion   │  Talent Attrition │  Growth Ceiling  │
│                   │                   │                   │
│  Without margin   │  Without structure│  Without ranked   │
│  visibility, you  │  top performers   │  intelligence,    │
│  can't protect    │  leave for        │  every decision   │
│  profitability.   │  clarity.         │  is a guess.      │
└──────────────────┴──────────────────┴──────────────────┘
```
- Cards: bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8
- Title: font-display text-lg tracking-wide text-white mb-3
- Body: font-sans text-sm text-slate-400 leading-relaxed
- Icon: w-10 h-10 bg-violet-500/10 rounded-xl, icon w-5 h-5 text-violet-400
- Responsive: stack to single column on mobile with gap-4

### Platform Preview (Full-width Screenshot)
```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│    ┌──────────────────────────────────────────────────────┐    │
│    │                                                      │    │
│    │           [Dashboard screenshot / mockup]            │    │
│    │                                                      │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
- Container: max-w-5xl mx-auto, rounded-2xl overflow-hidden, border border-white/[0.08]
- Shadow: shadow-2xl shadow-violet-500/10
- Glow: pseudo-element with violet radial gradient behind
- Image: static screenshot or Lottie placeholder for now
- Responsive: scales proportionally, padding reduces on mobile

### Intelligence Pillars (4 columns)
```text
┌────────────┬────────────┬────────────┬────────────┐
│  OBSERVE    │  COMPARE   │  DETECT    │  RECOMMEND │
│  Continuous │  Against   │  Deviation │  Ranked    │
│  monitoring │  structure │  flagging  │  actions   │
└────────────┴────────────┴────────────┴────────────┘
```
- Layout: 4-column grid on desktop, 2x2 on tablet, single stack on mobile
- Each pillar: text-center, icon (w-12 h-12 mx-auto), font-display uppercase text-sm tracking-[0.15em] for title
- Connecting line/dots between pillars on desktop (CSS pseudo-elements)
- Number badge: "01" "02" "03" "04" in text-violet-500/30 text-6xl absolute, z-behind

### Outcome Metrics
```text
┌──────────────┬──────────────┬──────────────┐
│     23%      │     4.2h     │     89%      │
│  avg margin  │  saved per   │  drift       │
│  improvement │  week        │  reduction   │
└──────────────┴──────────────┴──────────────┘
```
- Stats: font-display text-5xl text-white, animated count-up on scroll into view
- Labels: font-sans text-sm text-slate-400 uppercase tracking-wide
- Responsive: 3-column → single stack on mobile

### Ecosystem Preview (4 cards)
```text
┌──────────────────────┬──────────────────────┐
│ Intelligence Brief    │ Marketing OS          │
│ Weekly executive      │ Campaign generation   │
│ decision briefing     │ with ROI attribution  │
├──────────────────────┼──────────────────────┤
│ Simulation Engine     │ Automation            │
│ What-if modeling      │ Guardrailed actions   │
│ before you act        │ within constraints    │
└──────────────────────┴──────────────────────┘
```
- 2x2 grid on desktop, single stack on mobile
- Each card: bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8, hover:border-violet-500/30 transition
- Phase badge on future items: "Coming Soon" in text-xs text-slate-500 uppercase
- Card title: font-display text-base tracking-wide
- Card body: font-sans text-sm text-slate-400

### Testimonial
```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  "Zura showed us exactly where we were losing margin.          │
│   We recovered $84K in the first quarter."                     │
│                                                                │
│  — [Name], [Title], [Organization]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
- Quote: font-serif text-2xl sm:text-3xl text-white/90 italic leading-relaxed
- Attribution: font-sans text-sm text-slate-400
- Container: max-w-3xl mx-auto text-center py-24

### Final CTA
```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│         See what Zura sees in your business.                   │
│                                                                │
│                    [Request a Demo]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
- Headline: font-display text-3xl sm:text-4xl tracking-tight
- CTA: same as hero primary button
- Background: subtle violet gradient overlay

### Footer
```text
┌────────────────────────────────────────────────────────────────┐
│  [Z Logo] ZURA          Product  Ecosystem  Pricing  Login    │
│                                                                │
│  © 2026 Zura Platform. All rights reserved.                    │
└────────────────────────────────────────────────────────────────┘
```
- border-t border-white/[0.06], py-12, max-w-7xl
- font-sans text-sm text-slate-500

### Component System

**Buttons:**
| Variant | Classes | Usage |
|---------|---------|-------|
| Primary | bg-gradient violet→purple, rounded-xl, shadow-lg, h-12 px-8 | Hero CTA, final CTA |
| Secondary | bg-white/5 border-white/10, rounded-xl, h-12 px-8 | Explore, secondary actions |
| Nav CTA | bg-violet-600, rounded-lg, h-10 px-6 | Navigation "Request Demo" |
| Ghost | text-slate-400 hover:text-white | Nav links |

**Cards:**
| Type | Usage | Key Classes |
|------|-------|-------------|
| Feature card | Problem statement, feature grid | bg-white/[0.03] border-white/[0.06] rounded-2xl p-8 |
| Ecosystem card | Ecosystem preview | Same + hover:border-violet-500/30 |
| Stat card | Metric counters | Transparent, centered content |

**Section containers:**
- All sections: px-8 py-20 sm:py-24, max-w-7xl mx-auto
- Section headers: font-display text-3xl sm:text-4xl tracking-tight text-center mb-4
- Section subtitles: font-sans text-lg text-slate-400 text-center max-w-2xl mx-auto mb-16

### Layout System
- **Grid**: CSS Grid, 12-column on desktop
- **Max width**: 1280px (max-w-7xl) for content, 1120px (max-w-5xl) for focused sections
- **Section spacing**: py-20 (80px) desktop, py-16 (64px) tablet, py-12 (48px) mobile
- **Card gaps**: gap-6 (24px)
- **Breakpoints**: sm:640, md:768, lg:1024, xl:1280

---

## PART 5: IMPLEMENTATION-READY BUILD PROMPT

### File Structure
```text
src/
├── components/
│   └── marketing/
│       ├── MarketingLayout.tsx        (nav + footer wrapper)
│       ├── MarketingNav.tsx           (sticky nav with scroll behavior)
│       ├── MarketingFooter.tsx
│       ├── HeroSection.tsx
│       ├── LogoBar.tsx
│       ├── ProblemStatement.tsx
│       ├── PlatformPreview.tsx
│       ├── IntelligencePillars.tsx
│       ├── OutcomeMetrics.tsx
│       ├── EcosystemPreview.tsx
│       ├── TestimonialSection.tsx
│       └── FinalCTA.tsx
├── pages/
│   ├── PlatformLanding.tsx            (rewrite — compose marketing sections)
│   ├── ProductPage.tsx                (new — future)
│   └── EcosystemPage.tsx             (new — future)
└── index.css                          (append .marketing-surface scope)
```

### Implementation Rules
1. All new components in `src/components/marketing/` only
2. CSS scoped under `.marketing-surface` class in `index.css`
3. Import `PLATFORM_NAME`, `PLATFORM_NAME_FULL`, etc. from `src/lib/brand.ts`
4. Use `PlatformLogo` from `src/components/brand/PlatformLogo.tsx`
5. Font classes: `font-display` for headlines, `font-sans` for body -- max weight `font-medium`
6. No imports from `src/components/dashboard/` or `src/components/platform/`
7. No modifications to `src/lib/design-tokens.ts`
8. No modifications to existing CSS blocks in `index.css`
9. `UnifiedLogin.tsx` -- visual restyle only, zero auth logic changes
10. All copy uses brand tokens, never hardcoded "Zura" strings
11. Mobile-first responsive: define mobile layout, then layer breakpoints
12. Scroll animations: CSS `@keyframes` + Intersection Observer, no heavy libraries

### Routes (in App.tsx)
- `"/"` → `PlatformLanding` (existing route, component rewritten)
- `"/product"` → `ProductPage` (new route, Phase 2)
- `"/ecosystem"` → `EcosystemPage` (new route, Phase 2)
- All existing routes remain untouched

### Phase 1 Deliverable (This Build)
- Rewritten `PlatformLanding.tsx` with all 11 sections
- `MarketingLayout` + all section components
- `.marketing-surface` CSS scope appended to `index.css`
- Login page visual alignment (scoped restyle)
- Mobile-responsive across all breakpoints

### Phase 2 (Future)
- `/product` deep-dive page
- `/ecosystem` page
- Animated product screenshots
- Demo request form with backend integration

---

## SELF-VALIDATION AUDIT

- [x] Every section has a defined purpose and conversion role
- [x] No redundancy -- each section advances the visitor toward demo request
- [x] Messaging hierarchy: category → problem → solution → proof → CTA
- [x] Conversion flow: Hero CTA → Logo trust → Problem urgency → Platform proof → Ecosystem depth → Testimonial credibility → Final CTA
- [x] Login remains isolated -- separate from marketing flow, clean transition
- [x] Ecosystem presented as 4 distinct surfaces, not feature soup
- [x] Platform/app/tenant boundaries fully preserved -- zero cross-layer file changes
- [x] All components have defined responsive behavior at every breakpoint
- [x] Layout is 12-column grid-aligned with consistent max-width containers
- [x] Spacing is systematic (py-20/py-16/py-12 at breakpoints)
- [x] Visual hierarchy maintained: font-display for headlines, font-sans for body, violet accents for emphasis
- [x] No `font-bold`, `font-semibold` used anywhere -- max `font-medium`
- [x] Brand tokens used for all platform identity references

