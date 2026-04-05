

# Cinematic Hero + Interactive Demo Architecture

## Current State Assessment

The foundation is already strong. The Hero has a live DashboardMockup with phase-cycling (Observe→Detect→Act→Pause) and synced narration. The SystemWalkthrough shows Connect→Observe→Detect→Act with auto-advancing tabs. The PersonaExplorer provides interactive problem→solution mapping. The `/demo` page is a lead capture form only — no actual product experience exists.

**What's missing:** There is no way for a visitor to *experience* Zura before requesting a demo. The hero mockup is passive (watch-only). There are no guided product simulations. The "See it in action" promise leads to a form, not an experience.

---

## Architecture: Two Layers

```text
Layer 1: CINEMATIC HERO (enhanced)
  → Existing DashboardMockup becomes interactive on hover/click
  → "See it in action" CTA scrolls to SystemWalkthrough instead of /demo
  → Hero gains a third CTA: "Try the Demo" → /explore

Layer 2: INTERACTIVE DEMO (/explore)
  → New route with 3 guided scenario flows
  → Simulated UI panels (not real data)
  → Step-through experience with tooltips
  → Exits to /demo (lead capture) at completion
```

---

## Section 1: Hero Enhancement — Interactive Mockup

**Current:** DashboardMockup auto-cycles passively. User watches.

**Enhancement:** Make the mockup respond to user interaction.
- On hover over a KPI tile, pause auto-cycle and show a tooltip explaining the metric
- Clicking the "APPLY" button in the lever card triggers the act phase manually (satisfying micro-interaction)
- Add a pulsing "See it in action" anchor link below the narration strip that smooth-scrolls to SystemWalkthrough
- Replace the secondary "Explore the Platform" CTA with "Try the Interactive Demo" → `/explore`

**Files:** Modify `DashboardMockup.tsx`, `HeroSection.tsx`

---

## Section 2: Interactive Demo Page (`/explore`)

**New page** — a full-screen guided product simulation with 3 scenario tabs.

### Scenario Structure

Each scenario is a 3–5 step guided walkthrough using simulated UI panels.

**Scenario 1: "Your Day in Zura"**
- Step 1: Simulated daily schedule view (time slots with appointments, 2 visible gaps highlighted in amber)
- Step 2: Zura detects the gaps, shows a lever card: "Reach out to 3 clients who haven't rebooked"
- Step 3: User clicks "Apply" → gaps fill with green, revenue counter ticks up
- Tooltip guidance at each step

**Scenario 2: "Your Team at a Glance"**
- Step 1: 4 stylist performance cards (utilization %, retention %, revenue) — one visibly underperforming (amber)
- Step 2: Zura highlights the underperformer, shows context: "Sarah's retention dropped 15% this month"
- Step 3: Lever card: "Schedule a 1:1 and review her rebooking flow" → card turns green with checkmark
- Tooltip: "Zura surfaces who needs support — before it becomes a problem"

**Scenario 3: "What Needs Attention"**
- Step 1: Command Center view with 3 priority cards (Margin dip, Stockout risk, Utilization drop)
- Step 2: Cards rank themselves by impact (animated reorder)
- Step 3: Top card expands to show lever + projected impact
- Tooltip: "One screen. Ranked by what matters most."

### Interaction Model
- Horizontal scenario tabs at top (pill style, matching SystemWalkthrough)
- Each scenario has a step indicator (dots or numbered pills)
- "Next" button advances steps; "Back" goes back
- Tooltip/highlight layer with pulsing rings on interactive elements
- At final step of each scenario → "Get a Demo" CTA card slides in

### Mobile Adaptation
- Scenarios stack as full-width cards
- Step-through uses swipe or tap-to-advance
- Tooltips become inline callout cards below the simulated UI
- Simplified simulated panels (fewer columns, stacked layouts)

**Files:** New `src/pages/InteractiveDemo.tsx`, new `src/components/marketing/demo/` directory with `DemoScenario.tsx`, `DemoScheduleView.tsx`, `DemoTeamView.tsx`, `DemoCommandView.tsx`, `DemoTooltip.tsx`

---

## Section 3: Navigation + Routing

- Add `/explore` route to `App.tsx`
- Add "Try Demo" link to `MarketingNav.tsx` nav links array
- Update Hero secondary CTA to point to `/explore`
- Add "Interactive Demo" entry to footer Platform column

**Files:** Modify `App.tsx`, `MarketingNav.tsx`, `MarketingFooter.tsx`, `HeroSection.tsx`

---

## Section 4: Demo Exit → Conversion Bridge

At the end of each scenario flow, render a contextual CTA card:
- Headline: "This is how {PLATFORM_NAME} works for your salon."
- Body: "Want to see it with your real data?"
- Primary CTA: "Get a Demo" → `/demo`
- Secondary: "Try another scenario" → resets to scenario picker
- Trust signal: "Join 50+ salon locations"

**File:** New `src/components/marketing/demo/DemoExitCTA.tsx`

---

## UI + Motion Direction

| Element | Duration | Easing | Trigger |
|---------|----------|--------|---------|
| Scenario tab switch | 300ms | ease-out | Click |
| Step advance | 400ms | cubic-bezier(0.16,1,0.3,1) | Click "Next" |
| Tooltip appear | 200ms | ease-out | Step activation |
| Simulated data fill | 800ms | ease-out-cubic | Step trigger |
| Lever card slide-in | 500ms | ease-out | Step trigger |
| KPI counter tick | 1000ms | ease-out-quartic | Apply action |
| Pulsing highlight ring | 2s loop | ease-in-out | Active element |

All animations respect `prefers-reduced-motion`. No scroll hijacking.

---

## Responsive Plan

| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Scenario tabs | Horizontal pills | Horizontal, scrollable | Horizontal, scrollable |
| Step content | Full panel | Full panel | Stacked, simplified |
| Tooltips | Floating with arrow | Floating | Inline callout card |
| Schedule sim | 5-column time grid | 3-column | Single-column list |
| Team cards | 4-across grid | 2x2 grid | Vertical stack |
| Command cards | 3-column | 2+1 | Vertical stack |
| Step nav | Bottom bar with dots | Same | Same, full-width buttons |

---

## Technical Summary

| File | Action | Purpose |
|------|--------|---------|
| `DashboardMockup.tsx` | Modify | Add hover pause, click-to-apply interaction |
| `HeroSection.tsx` | Modify | Update secondary CTA → `/explore`, add scroll anchor |
| `InteractiveDemo.tsx` | **Create** | New page: guided demo with 3 scenarios |
| `demo/DemoScenario.tsx` | **Create** | Shared scenario shell (tabs, steps, tooltips) |
| `demo/DemoScheduleView.tsx` | **Create** | "Your Day" simulated schedule UI |
| `demo/DemoTeamView.tsx` | **Create** | "Your Team" simulated performance cards |
| `demo/DemoCommandView.tsx` | **Create** | "What Needs Attention" command center sim |
| `demo/DemoTooltip.tsx` | **Create** | Guided tooltip/highlight component |
| `demo/DemoExitCTA.tsx` | **Create** | Conversion CTA at scenario end |
| `App.tsx` | Modify | Add `/explore` route |
| `MarketingNav.tsx` | Modify | Add "Try Demo" link |
| `MarketingFooter.tsx` | Modify | Add "Interactive Demo" to footer |

**7 new files, 5 modified, 0 deleted.**

