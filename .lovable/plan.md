

# Salon Reality Check Section

## Placement
After Section 1.75 (Before/After, ends line 705) and before the divider at line 707. This positions it between the transformation comparison and the loss aversion problem section — bridging "what changes" into "why it matters."

## Implementation (all in `BackroomPaywall.tsx`)

### Content
**Headline:** "What Most Salon Backrooms Don't Track"  
**Subtitle:** "Most salons operate the backroom on instinct. Zura Backroom makes it measurable."

**6 Reality Points:**
1. `Droplets` — **Unmeasured Usage** — Product is dispensed without tracking how much goes into each bowl.
2. `Brain` — **Unrecorded Formulas** — Client formulas live in notebooks, memory, or not at all.
3. `Scale` — **Unstandardized Mixing** — Assistants mix bowls without consistent measurements across services.
4. `PackageSearch` — **Surprise Shortages** — Inventory gaps surface mid-service with no advance warning.
5. `DollarSign` — **Unknown Service Costs** — The true product cost behind each color service is rarely calculated.
6. `AlertTriangle` — **Invisible Waste** — Chemical waste accumulates quietly until it shows up in the budget.

**Transition:** "Zura Backroom turns these unknowns into structured, measurable data."

**CTA:** `ActivateButton` centered below.

### Layout
- Section wrapped in standard spacing `pb-20 md:pb-24` (no tinted bg — keeps alternating rhythm since Before/After above is tinted)
- `RevealOnScroll` on heading block
- 3×2 grid on desktop (`grid-cols-3`), 2-col on tablet (`sm:grid-cols-2`), stacked on mobile
- Each card: `Card` with `p-5`, icon in a `w-10 h-10 rounded-xl bg-muted` container, short title (`font-display text-sm tracking-wide`), one-line description (`text-sm text-muted-foreground`)
- Cards wrapped in `RevealOnScroll` with staggered `delay={i * 60}`
- Subtle hover: `hover:shadow-md transition-shadow duration-200`
- Transition message centered below grid, `text-base text-muted-foreground font-light`

### Icons
All already imported: `Droplets`, `Brain`, `Scale`, `PackageSearch`, `DollarSign`, `AlertTriangle`.

### Section number
Label as Section 1.85 in the comment block.

