# Revamp Front-End Marketing Copy — Clean + Converting Language

## What This Changes
A full copy overhaul of the marketing landing page, applying the 10-section language brief across every user-facing string. No structural, layout, or component changes — copy only.

## File-by-File Changes

### 1. `HeroSection.tsx`
- **Headline**: "Stop Managing. Start Growing." → "Run your salon with clarity, not chaos."
- **Subheadline**: "Clear data. Actionable insights..." → "One platform that connects your schedule, team, inventory, and business performance — so you always know what's working and what needs attention."
- **Primary CTA**: "Request Demo" → "Get a Demo"
- **Secondary CTA**: "Explore Platform" → "Explore the Platform"
- **Pill badge**: "Built by Multi-Location Salon Owners" → "Built with real salon owners"
- **Trust line**: Keep "No credit card required" — remove "See results in your first week" (fluffy), replace with "See your salon clearly from day one"

### 2. `StatBar.tsx`
- Trust header: "Trusted by salon owners building real businesses" — keep as-is (already clean)
- "Tools Replaced" label → "Tools replaced by one system" (reinforces section 5 of brief)

### 3. `ProblemStatement.tsx`
- **Left headline**: "You already know the problems..." → "Running a salon shouldn't feel like guessing."
- **Left subtext (add)**: Brief list matching the brief: "You're managing a full schedule, a team with different levels of performance, inventory that's always running low, clients who don't always rebook, and numbers you don't fully trust."
- **Closing line**: "These aren't six separate problems..." → "Most systems show you information. They don't help you actually run your business."
- Individual pain point copy — minor tightening to remove jargon:
  - "No service-level margin data" → "No clear view of what's actually profitable"
  - "No career paths, no transparent comp, no growth plan" → "No growth path, no clear pay structure, no plan"
  - "Every decision runs through you. Vacations are a liability." → keep (already clean)
  - Remove "accountability" (corporate), replace with "no way to track progress"

### 4. `SolutionShowcase.tsx`
- **Section label**: "The Platform" → keep
- **Heading**: "Every problem you face. One system to solve it." → "Everything your salon needs. Finally working together."
- **Subheadline**: swap "replaces scattered tools" → "Instead of disconnected tools and guesswork, Zura brings everything into one place — and shows you what to focus on next."
- Solution card rewrites (matching brief value pillars):
  - "Data & Visibility" → "See What's Actually Happening" / "Clarity replaces guesswork."
  - "Smart Recommendations" → keep problem, rewrite solution: "Weekly reports that show you exactly what to fix first — not more dashboards to interpret."
  - "Team & Talent" → "Manage Your Team With Confidence" / "Lead your team with clarity, not assumptions."
  - "Management & Leadership" → keep problem, tighten: "Performance tracking, scheduling, and systems that free you from being the bottleneck."
  - "Onboarding & Training" → keep, tighten: "Step-by-step training so new team members produce in weeks — not months."
  - "Marketing & Growth" → "Marketing that actually connects to results" / remove "pipelines" (jargon)

### 5. `PersonaExplorer.tsx`
- Already uses clean language — no changes needed (this was written with the same principles)

### 6. `BuiltByOperators.tsx`
- **Section label**: "Origin Story" → "Built for how salons actually run"
- **Heading**: keep "We didn't study salons. We ran them."
- Body copy — minor: remove "So we built the system we needed" → "So we built what we wished existed."
- Stat callout: "12 years of salon operations distilled into one platform" → keep

### 7. `OutcomeMetrics.tsx`
- **Section label**: "Outcomes" → "Results"
- **Heading**: "Results salon owners are seeing" → keep (already clean)
- Metric contexts — tighten:
  - "Service-level visibility drives recovery" → "Clear pricing data drives recovery"
  - "Clear insights replace hours of manual review" → "One system replaces hours of manual review"

### 8. `TestimonialSection.tsx`
- Already clean — no changes

### 9. `FinalCTA.tsx`
- **Heading**: "Your data has answers..." → "A better way to run your salon."
- **Body**: "Request a 15-minute walkthrough..." → "See how Zura connects your schedule, team, and business performance in one clear system."
- **Sub-body**: "No commitment. No credit card." → keep
- **Primary CTA**: "Request a Demo" → "Get a Demo"
- **Secondary CTA**: "Explore the Platform" → keep

### 10. `MarketingNav.tsx`
- CTA button: "Request Demo" → "Get a Demo"

### 11. `MarketingFooter.tsx`
- Footer descriptor uses `PLATFORM_DESCRIPTOR` token ("Guided Intelligence for Scaling Operators") — leave as-is since it's a brand token, not user-facing marketing copy on the page itself

### 12. `IntelligencePillars.tsx`
- **Section label**: "Intelligence Architecture" → "How it works"
- **Heading**: "How Zura thinks" → keep
- **Subheadline**: "A structured intelligence loop that replaces reactive management with ranked clarity" → "Zura watches your business, spots what's off, and tells you what to focus on."
- Pillar descriptions:
  - "Continuous monitoring across revenue, utilization, retention, and margin" → "Keeps an eye on your revenue, bookings, retention, and costs — always running."
  - "Benchmark performance against your architecture and cross-location standards" → "Compares each location and service against what's actually working."
  - "Flag deviations before they become crises. Drift detection across every KPI." → "Catches problems early — before they become expensive."
  - "Ranked, high-confidence actions. One primary lever. No noise." → "Tells you exactly what to fix next. One clear recommendation."

## What Does NOT Change
- Component names, file names, variable names — internal code stays as-is
- Brand tokens in `brand.ts` — unchanged
- Layout, structure, CSS, animations — zero visual changes
- PersonaExplorer — already matches the new tone
- EcosystemPreview — not currently on the landing page

## Tone Checklist (from the brief)
- No "leverage," "optimize," "utilization," "infrastructure" in user-facing copy
- No buzzwords or investor-speak
- Clear, confident, grounded, helpful
- Written for salon owners, not VCs
