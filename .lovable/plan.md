

# "From Insight to Execution" — Capital Section Build Plan

## What We're Building

A premium marketing section for the Zura sales page (`PlatformLanding.tsx`) that positions the funding capability as a natural extension of the intelligence system. Not fintech. Growth acceleration.

## Placement

Between `FounderQuote` and `OutcomeMetrics` in `PlatformLanding.tsx` — after the narrative has established Zura's intelligence and before the proof/CTA sections.

## Component: `InsightToExecution.tsx`

Single file in `src/components/marketing/`. Follows existing patterns: `useScrollReveal`, `mkt-reveal` classes, `motion` from framer-motion, explicit marketing palette colors (not theme tokens), `font-display` for headlines, `font-sans` for body.

### Section Structure (top to bottom)

**1. Hero Header**
- Eyebrow: `FROM INSIGHT TO EXECUTION` (font-display, tracking-[0.15em], dusky color)
- Headline: "Zura doesn't just tell you how to grow — " + gradient span: "it helps you fund it."
- Subhead: "Zura identifies your highest-return opportunities — and lets you fund them instantly when it makes sense."

**2. Animated Flow (the centerpiece)**

A 4-step horizontal (desktop) / vertical (mobile) animated pipeline showing the Decision → Action → Outcome loop:

| Step | Icon | Label | Detail |
|---|---|---|---|
| 1 | TrendingUp | Insight Detected | "Extensions demand exceeding capacity" |
| 2 | Target | Opportunity Scored | "+$8,200/mo · Break-even: 5.8 months" |
| 3 | Banknote | Funding Available | "$35,000 ready to deploy" |
| 4 | Rocket | Growth Activated | "Capacity expanded. Revenue climbing." |

Each step animates in sequentially (staggered 0.3s). Connected by animated gradient lines (violet→purple). Auto-advances through steps like `SystemWalkthrough` (reuse same pattern with `AnimatePresence`). Steps are clickable to pause and select.

**3. Three Value Pillars (3-column grid)**

Cards with icon containers (w-10 h-10 rounded-lg bg-violet-500/10), using the established card style (border-white/[0.06], bg-white/[0.03]):

- **Identify the Opportunity** — Eye icon. "Zura continuously analyzes your business to surface where you're leaving money on the table." Bullets: Demand gaps · Capacity constraints · Missed bookings.
- **Validate the Return** — BarChart3 icon. "Every opportunity is scored on real data." Bullets: Expected revenue lift · Break-even timeline · Confidence level.
- **Fund It Instantly** — Zap icon. "When an opportunity makes sense, Zura connects you to funding — seamlessly." Bullets: No applications upfront · No browsing loan options · Execution when ready.

**4. Product UI Mock**

A simulated Zura Capital card matching the dark SaaS aesthetic:
- Header row: "ZURA CAPITAL" label + status badge
- Title: "Mesa Extensions Expansion"
- KPI row: "+$8,200/month" (violet gradient text) | "Break-even: 5.8 months"
- Funding bar: "$35,000 available" with animated fill
- CTA button: gradient violet pill "Fund This"
- Subtle glow border (violet-500/20)

Card animates in with scale-in + fade. On hover, slight lift + glow intensify.

**5. Differentiation Block**

Two-column layout:
- Left: "Most software shows you problems." (large, white)
- Right: Two stacked mini-lists comparing "Other platforms" (dashboards, reports, suggestions — slate-500 text) vs "Zura" (identifies, tells you what to do, executes, funds — violet-400 text with checkmarks)

**6. Trust / Control Strip**

Centered text block with shield icon:
- "You stay in control."
- "Zura never pushes funding. It only appears when the numbers make sense."
- Three trust points inline: "Real performance data · Clear expected outcomes · Full transparency" — subtle slate-400 text.

**7. Section CTA**

Reuses the established dual-button pattern from HeroSection/FinalCTA:
- "Ready to grow without guessing?"
- Primary: "See How Zura Works" → `/demo`
- Secondary: "Start Free Trial" → `/explore`

## File Changes

| File | Action |
|---|---|
| `src/components/marketing/InsightToExecution.tsx` | CREATE — Full section (~350 lines) |
| `src/pages/PlatformLanding.tsx` | UPDATE — Import + place between `FounderQuote` and `OutcomeMetrics` |

## Technical Notes

- All colors use explicit marketing palette (`text-white`, `text-slate-400`, `text-violet-400`, `bg-violet-500/10`) — no semantic tokens
- Uses `motion` from framer-motion for all animations
- Uses `useScrollReveal` + `mkt-reveal` for scroll-triggered reveals
- Uses `useInView` from framer-motion for the flow animation trigger
- Uses `useIsMobile` for responsive layout switching
- `AnimatedNumber` reused for the KPI in the mock card
- No new dependencies required

