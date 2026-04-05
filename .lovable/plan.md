

# Deep Polish Pass — Landing Page, Nav, Footer, and Demo Flow

## Overview
A comprehensive refinement across every marketing surface: sharper conversion copy, stronger visual hierarchy, new sections for persona targeting and the demo request flow, and UI polish on every existing component.

## Changes

### 1. MarketingNav — Premium Polish
- Add a subtle gradient shimmer on the "Request Demo" CTA button (violet gradient, not flat color)
- Add a `Pricing` nav link placeholder (links to `/demo` for now with anchor text "Pricing")
- Rounded-full pill shape on the CTA to match Apple aesthetic
- On scroll, add a subtle `shadow-lg` to the nav bar for depth

### 2. HeroSection — Stronger Conversion Copy
- Rewrite headline: "Stop Managing. Start Architecting." with gradient on "Architecting"
- Subline: "Built by multi-location salon owners. Designed to surface the exact lever to pull next."
- Add a third trust line below CTAs: small text "No credit card required. See results in your first week."
- Increase spacing and make the pill badge more prominent with a shimmer border animation

### 3. StatBar — Add a Fourth Stat + Visual Uplift
- Add 4th stat: "12 → 1 Tools Replaced" to communicate consolidation
- Add thin gradient dividers between stats on desktop
- Slightly larger typography on the stat values

### 4. ProblemStatement — Deeper Emotional Hook + Fourth Pain Point
- Add 4th pain point: "Founder Bottleneck" — "Every decision flows through you. Your business cannot scale past your availability."
- Tighten copy on existing pain points to be more visceral and operator-specific
- Add a closing line below pain points: "These are symptoms. The root is infrastructure."

### 5. PlatformPreview — Remove Duplicate
- The DashboardMockup already appears in the Hero. PlatformPreview currently duplicates it.
- Replace PlatformPreview content with a new "How It Works" 3-step section: Observe → Detect → Act (different from IntelligencePillars — this is the simplified version with mockup screenshots/icons for each step)
- Or remove from page order entirely since the animated mockup in the hero tells the story

### 6. IntelligencePillars — Visual Upgrade
- Add connecting gradient lines between pillar cards (not just arrow icons)
- Add a subtle animated dot that travels along the connecting line to suggest continuous flow
- Stronger icon treatment with larger icon boxes

### 7. BuiltByOperators — Founder Credibility Boost
- Rewrite narrative copy to be more personal and specific: "We scaled from one chair to twelve locations. Every tool we tried was built for booking — not for building a business."
- Add a key stat callout: "12 years of salon operations distilled into one platform"
- Add a subtle gradient border on the section for visual separation

### 8. NEW: Persona Targeting Section (replaces or follows BuiltByOperators)
Create `src/components/marketing/PersonaTargeting.tsx`:
- 4 persona cards matching the brand bible segments:
  - "The Overwhelmed Operator" — "Working nonstop. Still behind."
  - "The Plateaued Founder" — "Revenue stable. Growth stalled."
  - "The Scaling Operator" — "Growing fast. Getting messy."
  - "The Strategic Leader" — "You need structured intelligence."
- Each card has a one-line description and a subtle hover glow
- Positioned as "Where are you?" with the implicit answer being "We built for all of you"

### 9. OutcomeMetrics — Context Cards
- Add a descriptive subtitle card beneath each metric
- Add thin gradient border on the metric containers
- Slightly more breathing room between metrics

### 10. FeatureGrid — True Bento Layout
- Change grid to actual bento: first 2 cards span wider (lg:col-span-2 in a 3-col grid becomes 2 large + 4 small)
- Add subtle gradient overlays on the large cards
- Add small "→" arrow links on each card suggesting deeper exploration

### 11. TestimonialSection — More Attribution Depth
- Add a location count badge next to each attribution
- Increase quote font size slightly for more visual impact
- Add a subtle quote mark decorative element (large translucent " mark)

### 12. FinalCTA — Full Cinematic Treatment
- Larger section with more vertical padding
- Add animated particle/dot field in the background (pure CSS — small dots floating up slowly)
- Stronger headline: "See the levers hiding in your business"
- Add a third line: "Request a 15-minute walkthrough. No commitment."

### 13. MarketingFooter — Expand + Polish
- Add columns: Product, Company, Legal
- Add links: About, Demo, Privacy, Terms
- Add a tagline line: the brand descriptor
- More structured grid layout

### 14. Demo Page (`/demo`) — Conversion Redesign
- Redesign ProductDemo.tsx to use MarketingLayout wrapper (dark theme, consistent with landing)
- Replace the chat interface with a structured demo request form:
  - Name, Email, Number of Locations (dropdown: 1, 2-5, 6-15, 16+), Biggest Challenge (dropdown)
  - Clean form with glass card styling
- Or keep the AI chat as a secondary CTA: "Talk to our AI first" alongside the form
- Either way, wrap in MarketingLayout for visual consistency

### 15. Page Assembly — Reorder Sections in PlatformLanding.tsx
Final section order:
1. HeroSection (with animated dashboard mockup)
2. StatBar
3. ProblemStatement
4. PersonaTargeting (NEW)
5. IntelligencePillars
6. BuiltByOperators
7. OutcomeMetrics
8. FeatureGrid
9. TestimonialSection
10. FinalCTA

Remove PlatformPreview (dashboard mockup already in hero).

## Technical Notes
- All new components use existing `useScrollReveal`, `mkt-glass`, `mkt-reveal` patterns
- Brand tokens used throughout — zero hardcoded platform names
- No new dependencies — pure Tailwind + Lucide + existing CSS animation system
- Persona section data aligns with brand bible segments
- Marketing CSS namespace (`.marketing-surface`) prevents style leakage
- Mobile-first responsive on every section

## Build Order
1. CSS additions (floating dots keyframe, gradient dividers)
2. MarketingNav polish
3. HeroSection copy + visual rewrite
4. StatBar 4th stat + dividers
5. ProblemStatement 4th pain point + closing line
6. PersonaTargeting new component
7. IntelligencePillars visual upgrade
8. BuiltByOperators copy rewrite
9. OutcomeMetrics context cards
10. FeatureGrid bento layout
11. TestimonialSection attribution + decorative quote
12. FinalCTA cinematic treatment
13. MarketingFooter expansion
14. Demo page redesign
15. PlatformLanding.tsx reorder + remove PlatformPreview

