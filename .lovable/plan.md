

# Interactive "Without vs With Zura" Toggle Showcases

## Concept

Add a new section to the homepage: a set of **interactive toggle cards** where visitors flip between "Without Zura" (chaos state) and "With Zura" (solved state). Each card covers a different operational domain. The toggle creates a satisfying before/after reveal that makes the value tangible.

This is different from ChaosToClarity (which is scroll-driven and abstract). These are **specific, domain-focused mini-scenarios** with concrete numbers and visual state changes.

---

## Scenarios (3 toggle cards)

**1. Color Bar — "Your Backroom"**
- Without: Overmixing waste ($1,200/mo lost), out-of-stock alerts ignored, no formula history, stylists guessing ratios
- With: Tracked mixing sessions, reorder alerts before stockout, formula memory per client, waste down 30%

**2. Scheduling — "Your Calendar"**
- Without: 14 gaps this week, no-shows untracked, stylists unevenly booked, revenue left on the table
- With: Gaps detected and flagged, rebooking prompts sent, balanced utilization, $4,200/mo recovered

**3. Team Performance — "Your Team"**
- Without: No visibility into who's struggling, retention dropping silently, coaching is reactive
- With: Performance ranked, retention dips surfaced early, structured coaching paths, 67% faster ramp

---

## Interaction Design

- Each card has a **pill toggle** at the top: "Without Zura" / "With Zura"
- Default state: "Without Zura" (shows the pain first)
- Toggle animates a crossfade between chaos and clarity states
- Chaos state: warm amber/red tones, scattered metrics, warning icons
- Clarity state: violet/emerald tones, clean metrics, check icons
- Cards are arranged in a responsive 3-column grid (stacked on mobile)

---

## Section Structure

- Kicker: "See the difference"
- Headline: "Toggle it. Feel it."
- Subline: "Every salon runs into the same problems. Here's what changes when you stop guessing."
- 3 toggle cards below
- Placed after PersonaExplorer and before OutcomeMetrics (bridges experience → proof)

---

## Implementation

| File | Action | Purpose |
|------|--------|---------|
| `src/components/marketing/BeforeAfterShowcase.tsx` | **Create** | New section with 3 toggle cards |
| `src/pages/PlatformLanding.tsx` | Modify | Insert BeforeAfterShowcase between PersonaExplorer and SectionDivider/OutcomeMetrics |

**2 files total. 1 new, 1 modified.**

### Component Details

- Uses existing `useState` for toggle state (one per card)
- Framer Motion `AnimatePresence` for crossfade between states
- Each card is self-contained with its own toggle
- Chaos state uses amber/red color palette with warning indicators
- Clarity state uses violet/emerald palette with success indicators
- Responsive: 3-col on desktop, 2-col on tablet (third wraps), single-col stack on mobile
- All animations respect `prefers-reduced-motion`

