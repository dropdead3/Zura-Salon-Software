

# Interactive Persona Explorer — "Find Your Solution"

## Concept
Replace the static `PersonaTargeting` section with a two-step interactive component. The prospect selects **who they are**, then selects **which problems matter most** — and the section dynamically reveals tailored solutions, outcomes, and a CTA specific to their situation. This turns a passive scroll into an engaged, self-qualifying conversion moment.

## UX Flow

```text
Step 1: "Which best describes you?"
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Independent  │ │  Salon       │ │  Multi-      │ │  Enterprise  │
│  Stylist      │ │  Owner       │ │  Location    │ │  Leader      │
│               │ │              │ │  Owner       │ │              │
│  "About to    │ │ "Managing a  │ │ "2-15        │ │ "16+         │
│  rent my      │ │  small team" │ │  locations"  │ │  locations"  │
│  first chair" │ │              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Step 2: "What keeps you up at night?" (checkboxes, pick 1-3)
Shown problems are filtered by persona. e.g.:
- Independent: pricing, bookings, client retention, income tracking
- Salon Owner: team pay, hiring, training, profit visibility
- Multi-Location: consistency, benchmarking, manager oversight, scaling

Step 3: Dynamic solution panel (animated in)
Shows only the solutions matching selected problems, with
persona-specific language, an outcome stat, and a CTA.
```

## Persona Definitions (4 types)

| Persona | Label | Tagline | Problem Set |
|---|---|---|---|
| Independent Stylist | "Independent Stylist" | "Building your own brand behind the chair." | pricing, bookings, client retention, income tracking, marketing |
| Salon Owner | "Salon Owner" | "Managing a team. Wearing every hat." | team pay, hiring, training, profit visibility, stepping away, marketing |
| Multi-Location Owner | "Multi-Location Owner" | "Growing fast. Keeping it together." | consistency, benchmarking, manager tools, scaling, onboarding, hiring |
| Enterprise Leader | "Enterprise Leader" | "Running a brand. Thinking in margins." | cross-market data, executive reporting, standards enforcement, forecasting |

## Problem → Solution Cards (12-15 unique cards, shown contextually)

Each card contains:
- Problem headline (plain language)
- 2-3 sentence solution description
- One outcome stat (e.g., "Owners save 8+ hours/week")
- Icon

Examples:
- **"I don't know if I'm pricing right"** → "See exactly how much you make per service after product cost, time, and commission. Adjust pricing with confidence."
- **"My team has no growth path"** → "Build transparent performance tiers and career levels. Your team sees exactly what it takes to earn more."
- **"Every location runs differently"** → "Set standards once. Benchmark every location against them. Catch drift before it costs you."

## Component Architecture

### New file: `src/components/marketing/PersonaExplorer.tsx`
- State: `selectedPersona`, `selectedProblems[]`, animated transitions between steps
- Step 1: 4 persona cards in a row (clickable, `mkt-glass` style, violet glow on selected)
- Step 2: Slide-in grid of problem chips (filtered by persona), max 3 selectable
- Step 3: Animated solution cards appear below, filtered by selected problems
- Bottom CTA: "See how {PLATFORM_NAME} works for you" → links to `/demo`
- Uses `useScrollReveal` for initial entrance, React state for interactivity
- Smooth height transitions via CSS `grid-template-rows: 0fr → 1fr` pattern

### Modify: `src/pages/PlatformLanding.tsx`
- Replace `<PersonaTargeting />` with `<PersonaExplorer />`
- Keep `PersonaTargeting.tsx` in codebase (reusable elsewhere)

### Modify: `src/index.css` (if needed)
- Add any transition classes for the expand/collapse animations

## Design Details
- Persona cards: Same `mkt-glass` + `rounded-2xl` as existing cards, with violet border glow when selected
- Problem chips: Pill-shaped toggles, `bg-white/5` default, `bg-violet-500/20 border-violet-500/40` when selected
- Solution cards: Same bento style as `SolutionShowcase`, animated in with staggered delays
- All copy uses salon-owner language — zero jargon
- Mobile: stacks to single column, chips wrap naturally

## Section Placement
Replaces `PersonaTargeting` in the page flow (after `SolutionShowcase`, before `BuiltByOperators`). This is the engagement hook — by this point, the prospect has seen the problems and the platform overview. Now they self-select and see tailored proof.

## Files Summary
- **Create**: `src/components/marketing/PersonaExplorer.tsx`
- **Modify**: `src/pages/PlatformLanding.tsx` (swap component)
- No new dependencies

