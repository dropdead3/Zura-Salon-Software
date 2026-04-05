

# Rewrite Landing Page — Problem-Solution Selling for Salon Owners

## Diagnosis
The current page speaks in abstractions: "intelligence architecture," "infrastructure," "observe → compare → detect → recommend." These resonate with architects, not with salon owners who are drowning in spreadsheets, losing stylists, and can't figure out why Tuesday is always dead. The page needs to **name the daily pain**, then show **exactly how each part of the platform fixes it**.

## Strategy
Replace the abstract "capabilities" and "intelligence loop" framing with a **problem → solution grid** organized around the real operational categories salon owners think in. Keep the cinematic UI quality. Kill the jargon.

## Section-by-Section Changes

### 1. HeroSection — Keep, Sharpen Subline
- Headline stays: "Stop Managing. Start Architecting."
- **Rewrite subline** to be concrete: "Clear data. Actionable insights. Team tools that scale. Built by salon owners who grew from 1 to 12 locations."
- No structural changes needed.

### 2. StatBar — Keep As-Is
- Already strong.

### 3. ProblemStatement — Rewrite Pain Points to Daily Reality
Replace the 4 abstract pain points with **6 real problems salon owners face every day**:
- **"Where is my money going?"** — No service-level margin data. You guess at profitability.
- **"My best stylist just quit."** — No career paths, no transparent comp, no reason to stay.
- **"I can't step away."** — Every decision runs through you. Vacations are a liability.
- **"Training is chaos."** — New hires take months. No structured onboarding. No standards.
- **"Marketing feels random."** — You post, hope, and have no idea what drives bookings.
- **"I'm scaling blind."** — Revenue grows but you can't tell which location is healthy.

Keep the split layout (headline left, pain list right). Update the headline to: "You already know the problems. You just don't have the infrastructure to solve them."

### 4. NEW: SolutionShowcase — Replace FeatureGrid + IntelligencePillars
Create `src/components/marketing/SolutionShowcase.tsx` — a new section that maps **6 problem categories to 6 platform solutions** in a visual bento grid:

| Problem Category | Solution | Icon |
|---|---|---|
| Data & Visibility | Real-time dashboards with service-level margin, revenue, and utilization across every location | BarChart3 |
| Actionable Intelligence | Weekly briefs that rank problems and tell you exactly which lever to pull | Brain |
| Team & Talent | Performance tiers, career paths, commission architecture, and retention tracking | Users |
| Management & Leadership | Drift detection, capacity planning, and delegation tools that free the founder | Shield |
| Onboarding & Training | Structured onboarding flows, training hubs, and standards enforcement | GraduationCap |
| Marketing & Growth | Client acquisition, hiring campaigns, and ROI attribution in one system | Megaphone |

Layout: 3-column bento grid. Top 2 cards span wider (`lg:col-span-2` and `lg:col-span-1` alternating). Each card has icon, problem headline, solution description, and a subtle "Explore →" link.

This replaces both `FeatureGrid` and `IntelligencePillars` — those were too abstract. This section does the real selling.

### 5. PersonaTargeting — Keep, Minor Copy Tweak
- Change section header from "Where are you in your journey?" to "No matter where you are, we built for you."
- Descriptions already good.

### 6. BuiltByOperators — Rewrite for Specificity
- Replace generic narrative with **concrete operational details**: "We managed payroll for 80+ stylists. We tracked margin across 12 locations on spreadsheets. We lost top talent because we couldn't show them a growth path. So we built the system we needed."
- Keep credibility markers but update: "80+ stylists managed" / "12 locations scaled" / "$8M+ revenue operated" / "Zero outside investors"

### 7. OutcomeMetrics — Add a 4th Metric
- Add: `{ value: 67, suffix: '%', label: 'Faster new-hire ramp', context: 'Structured onboarding replaces tribal knowledge' }`
- Keeps the section concrete about training/onboarding outcomes.

### 8. TestimonialSection — Rewrite Quotes for Problem Specificity
- Quote 1: "I used to spend every Monday morning in spreadsheets trying to figure out which location was bleeding margin. Now I open one screen and know exactly what to fix."
- Quote 2: "We lost three senior stylists in six months before Zura. Once we built transparent career paths and commission tiers, retention flipped."
- Quote 3: "Our new hires used to take 90 days to get productive. With structured onboarding, we cut that to 30."

### 9. FinalCTA — Rewrite Headline
- Change to: "Your data has answers. Your team needs structure. Let us show you."
- Keep the dual-CTA and particle field.

### 10. PlatformLanding.tsx — Updated Section Order
1. HeroSection
2. StatBar
3. ProblemStatement (rewritten)
4. SolutionShowcase (NEW — replaces FeatureGrid + IntelligencePillars)
5. PersonaTargeting
6. BuiltByOperators (rewritten)
7. OutcomeMetrics (4th metric added)
8. TestimonialSection (rewritten)
9. FinalCTA (rewritten)

Remove `IntelligencePillars` and `FeatureGrid` from the page (components remain in codebase for `/product` or `/ecosystem` pages).

## Files to Modify
- `src/components/marketing/HeroSection.tsx` — subline rewrite
- `src/components/marketing/ProblemStatement.tsx` — 6 new pain points, new headline
- `src/components/marketing/PersonaTargeting.tsx` — header copy tweak
- `src/components/marketing/BuiltByOperators.tsx` — narrative + markers rewrite
- `src/components/marketing/OutcomeMetrics.tsx` — add 4th metric
- `src/components/marketing/TestimonialSection.tsx` — rewrite all 3 quotes
- `src/components/marketing/FinalCTA.tsx` — headline rewrite
- `src/pages/PlatformLanding.tsx` — reorder, swap in SolutionShowcase

## Files to Create
- `src/components/marketing/SolutionShowcase.tsx` — 6-category problem-solution bento grid

## Technical Notes
- Reuses all existing patterns: `useScrollReveal`, `mkt-glass`, `mkt-reveal`, brand tokens
- `IntelligencePillars` and `FeatureGrid` are removed from this page only — not deleted (reusable on `/product` or `/ecosystem`)
- No new dependencies
- Mobile-first responsive: bento grid collapses to single column

