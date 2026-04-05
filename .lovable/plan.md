

# Rebuild the Zura Landing Page — World-Class Salon Intelligence Sales Page

## Vision
Transform the current placeholder-heavy landing page into a premium, high-converting sales page that communicates: built by multi-location salon owners, designed for operators who want to scale, powered by real intelligence infrastructure. The reference image shows the caliber we're targeting — dark, cinematic, with real product UI as proof.

## Current State
The existing page has the right structure but lacks visual punch:
- Hero is text-only with no product visual
- LogoBar uses placeholder text ("Salon A", "Salon B")
- PlatformPreview is an empty gray box saying "Dashboard screenshot coming soon"
- TestimonialSection has one hardcoded quote with no attribution depth
- No animated dashboard mockups, no real product screenshots, no social proof images
- Sections feel flat — same card pattern repeated without variation

## Page Architecture (Section Order)

### 1. Hero — Cinematic + Product Visual
- Keep the gradient headline but add a dramatic ambient glow effect (inspired by the reference — a vertical light beam behind the headline)
- Add a floating, perspective-tilted dashboard mockup below the CTA buttons — a CSS-only recreation of the Command Center showing KPI tiles, revenue charts, and lever cards
- Animated entrance: staggered fade-up for headline, subline, CTAs, then the dashboard mock slides up with parallax

### 2. Social Proof Bar (replaces LogoBar)
- Replace placeholder text logos with a real stat bar: "Trusted by operators managing 50+ locations and $30M+ in annual revenue"
- Animated counter strip: locations managed, revenue monitored, stylists on platform
- No fake logos — numbers carry more weight until real brand logos are available

### 3. Problem Statement — Emotional + Visual
- Redesign from flat cards to a more dramatic split layout
- Left side: large display text "The beauty industry mastered artistry. It did not master infrastructure."
- Right side: animated list of pain points that fade in sequentially
- Stronger emotional hook targeting multi-location chaos

### 4. Product Showcase — Interactive Dashboard Mockup (replaces PlatformPreview)
- Create a CSS/SVG-rendered dashboard mock showing:
  - Revenue KPI tiles with animated counters
  - A simplified area chart (CSS gradients, no library needed)
  - Lever cards showing "Primary Lever: Increase Tuesday utilization by 12%"
  - Weekly intelligence brief preview
- Slight perspective tilt with hover parallax
- Glass-morphism container with violet glow backdrop
- Caption: "Real intelligence. Not another dashboard."

### 5. Intelligence Loop (IntelligencePillars)
- Upgrade from 4 flat cards to a connected timeline/flow visualization
- Horizontal on desktop with connecting lines/arrows between steps
- Each step has a subtle animated pulse showing the "loop" is continuous
- Larger icons, bolder numbering

### 6. Built by Operators Section (NEW)
- "Built by multi-location salon owners who lived the chaos"
- Two-column layout: narrative text left, credibility markers right
- Key messages: "We scaled from 1 to 12 locations. We built what we wished existed."
- No headshots needed — the story carries the weight

### 7. Outcome Metrics — Bolder Treatment
- Keep animated counters but add context cards beneath each number
- "$84K recovered in Q1" / "23% margin improvement" / "4.2 hours saved per week"
- Add a subtle background gradient strip to separate this section visually

### 8. Feature Grid (NEW — replaces EcosystemPreview on landing)
- 6 feature cards in a bento grid layout showing concrete capabilities:
  - Multi-location command center
  - Weekly intelligence briefs
  - Margin visibility at service level
  - Stylist performance architecture
  - Drift detection and alerting
  - Career path and commission architecture
- Each card has a small icon, title, one-line description
- Alternating sizes (2 large + 4 small in bento pattern)

### 9. Testimonials — Multi-Quote Carousel
- Upgrade from single quote to 3 rotating testimonials
- Auto-rotate with dot indicators
- Each quote attributed with role + location count

### 10. Final CTA — Full-Width Cinematic
- Dark-to-violet gradient background
- Larger headline: "See what Zura sees in your business"
- Dual CTAs: "Request a Demo" (primary) + "Explore the Platform" (secondary)
- Subtle animated particles or glow effect in background

## New Components to Create
1. `src/components/marketing/DashboardMockup.tsx` — CSS-rendered dashboard preview with KPI tiles, chart areas, and lever cards (no real data, purely visual)
2. `src/components/marketing/BuiltByOperators.tsx` — Founder credibility section
3. `src/components/marketing/FeatureGrid.tsx` — Bento-style capability showcase
4. `src/components/marketing/StatBar.tsx` — Animated social proof numbers (replaces LogoBar)

## Components to Heavily Refactor
1. `HeroSection.tsx` — Add ambient glow, dashboard mockup, stronger entrance animations
2. `ProblemStatement.tsx` — Split layout, emotional copy, sequential animations
3. `IntelligencePillars.tsx` — Connected flow visualization
4. `OutcomeMetrics.tsx` — Context cards beneath stats
5. `TestimonialSection.tsx` — Multi-quote with rotation
6. `FinalCTA.tsx` — Full-width cinematic treatment
7. `PlatformPreview.tsx` — Replace with DashboardMockup integration

## CSS Additions (in index.css)
- Ambient glow keyframes for hero light beam effect
- Perspective/tilt utilities for dashboard mockup
- Sequential fade-in animation variants (mkt-delay-4 through mkt-delay-8)
- Glass-morphism card variant for premium surfaces
- Gradient border animation for featured cards

## Technical Notes
- All mockup UI is pure CSS/SVG — no screenshots, no external images, no data dependencies
- Every section uses IntersectionObserver-based scroll reveal (extend existing mkt-fade-in system)
- Brand tokens used throughout — zero hardcoded "Zura" strings
- Mobile-first responsive: sections stack cleanly, mockup scales down gracefully
- No new dependencies — Tailwind + Lucide icons + existing animation system
- Marketing surface CSS namespace (.marketing-surface) prevents style leakage

## Build Order (8 phases)
1. CSS additions (glow effects, animations, glass utilities)
2. DashboardMockup component
3. Hero rebuild with mockup integration
4. StatBar (replace LogoBar)
5. Problem Statement + Built by Operators
6. Intelligence Pillars upgrade + Feature Grid
7. Outcome Metrics + Testimonials upgrade
8. Final CTA + PlatformLanding.tsx section reorder

