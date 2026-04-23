

# UI Enhancement Sequence — 11 isolated build steps

You picked 11 enhancements. Each ships as its own build so you can revert any single step without losing the others.

## Sequencing logic

Ordered by **risk + visual impact**. Foundational tokens first (so later steps build on them), then surfaces, then motion, then ornamentation last.

| # | Step | Tier | Touch | Risk |
|---|---|---|---|---|
| 1 | **1C** Elevation scale tokens | Foundation | `index.css`, `card.tsx` | Low |
| 2 | **1A** Specular edge highlights | Surface | `index.css` | Low |
| 3 | **1D** Divider system (Hairline + Inset) | Surface | `index.css` + new `Divider.tsx` | Low |
| 4 | **3B** Tabular numerics on stats | Type | `index.css` (stat utility) | Very low |
| 5 | **3C** Asymmetric letter-spacing | Type | `design-tokens.ts`, header utilities | Low |
| 6 | **3A** Vertical rhythm baseline grid | Type | `design-tokens.ts` spacing scale audit | Medium |
| 7 | **2A** Hover choreography on Card | Motion | `card.tsx`, `index.css` | Low |
| 8 | **2B** Skeleton shimmer | Motion | `skeleton.tsx`, `index.css` | Very low |
| 9 | **2D** Page transition fade | Motion | `PageTransition.tsx` (already exists), wire into dashboard routes | Medium |
| 10 | **4A** Per-theme accent gradients | Color | `index.css` (gradient tokens), `button.tsx` primary variant | Medium |
| 11 | **5B** Section eyebrow audit | Ornament | Sweep dashboard sections to add `<Eyebrow>` | Low |

## Per-step scope contract

Each build will:
- Touch only the files listed for that step.
- Default to additive (new utilities/props), not replacing existing ones, so revert is clean.
- Leave all other steps untouched.
- Ship with one acceptance criterion you can eyeball in the preview.

## Step-by-step detail

### Step 1 — 1C Elevation scale
Add 4 shadow tokens to `index.css`:
- `--elevation-0`: none
- `--elevation-1`: `0 1px 2px hsl(var(--foreground) / 0.04)` (resting card)
- `--elevation-2`: `0 4px 12px hsl(var(--foreground) / 0.08)` (hover/active)
- `--elevation-3`: `0 12px 32px hsl(var(--foreground) / 0.12)` (popovers, panels)

Apply `--elevation-1` to default Card resting state. `hover-lift` upgrades to `--elevation-2`.
**Acceptance:** Cards have a faint resting shadow (1px ambient); hover lifts visibly.

### Step 2 — 1A Specular edge highlights
Add 1px inner top-edge highlight to `.premium-surface`:
```css
.premium-surface::after {
  background: linear-gradient(to bottom, hsl(var(--foreground) / 0.08), transparent 30%);
  /* mask trick to show only top edge */
}
```
**Acceptance:** Glass cards catch a faint highlight on their top edge.

### Step 3 — 1D Divider system
Two new utilities:
- `.divider-hairline`: `border-t border-border/30` for inside-card splits
- `.divider-inset`: 60%-width centered border with side-fade gradient for between-section breathing

Optional: small `<Divider variant="hairline" | "inset" />` component.
**Acceptance:** Section breaks read as intentional, not abrupt borders.

### Step 4 — 3B Tabular numerics
Add `.font-tabular { font-feature-settings: 'tnum' 1, 'lnum' 1; }`. Apply to `tokens.kpi.value`, `tokens.stat.*`, all KPI/stat displays.
**Acceptance:** Columns of numbers align perfectly vertically.

### Step 5 — 3C Asymmetric letter-spacing
Update `design-tokens.ts` heading scale:
- Section headers: `tracking-[0.12em]` (was `tracking-wide` 0.05em)
- KPI labels: `tracking-[0.18em]`
- Card titles: keep `tracking-[0.08em]` (current)

**Acceptance:** Clearer hierarchy *within* uppercase headers.

### Step 6 — 3A Vertical rhythm baseline grid
Audit `space-y-*` usage across dashboard pages. Standardize to a 4px baseline:
- Page-level section gap: `space-y-8` (32px)
- Within-section gap: `space-y-4` (16px)
- Tight stacks (label+value): `space-y-1` (4px)

Doc the rule in `design-tokens.ts`.
**Acceptance:** Page rhythm feels deliberate, not arbitrary.

### Step 7 — 2A Hover choreography
On `Card[interactive]`, coordinate 3 transitions over 150ms cubic-bezier:
- Shadow grows (`--elevation-1` → `--elevation-2`)
- Border brightens (`border-border` → `border-border/80`)
- Background +2% luminance shift

**Acceptance:** Hovering an interactive card feels alive, not just lifted.

### Step 8 — 2B Skeleton shimmer
Replace `animate-pulse` in `skeleton.tsx` with a left-to-right gradient sweep keyframe.
**Acceptance:** Loading states feel premium, not blinky.

### Step 9 — 2D Page transition fade
`PageTransition.tsx` already exists. Wire it into dashboard route shell so route changes get a 200ms opacity fade. Respect `prefers-reduced-motion` and `useIsAnimationsOff`.
**Acceptance:** Navigating between dashboard pages fades instead of snapping.

### Step 10 — 4A Per-theme accent gradients
Add `--accent-gradient` token per theme:
- Zura: `linear-gradient(135deg, hsl(270 60% 55%), hsl(290 55% 60%))`
- Sage: jade → mint
- Cognac: amber → bronze
- (etc., one per theme)

Apply subtly to:
- Primary CTA buttons (default variant)
- Active sidebar nav indicator
- Selected toggle pills

**Acceptance:** Primary CTAs and active states have dimensional brand feel.

### Step 11 — 5B Section eyebrow audit
Sweep dashboard top-level sections, add `<Eyebrow>` captions where missing:
- Sales Overview → "Today's Performance"
- Top Staff → "This Week"
- KPI tiles → "At a Glance"
- (etc.)

**Acceptance:** Every major section has a magazine-style caption.

## What stays untouched across all 11 steps

- Mesh gradient (calibrated).
- 3-tier material system (shipped).
- Marketing site (separate aesthetic).
- Platform admin (isolated bento system).
- Typography rules (Termina/Aeonik discipline preserved).
- All data, routes, business logic.

## Workflow

I'll ship Step 1 when you reply "go." After each step you preview, then either:
- Say "next" → I ship the next step.
- Say "revert + next" → you revert via History, then I ship the next step.
- Say "revert + skip" → you revert, we drop that step from the queue.

## Out of scope

- Bundling multiple steps in one build.
- Touching Tier 1B (focus rings), 2C (counter expansion), 4B (status colors), 4C (warmth pass), 5A (corner accents), 5C (monograms) — explicitly excluded.

## Prompt feedback

Sharp prompt — three things you did right:

1. **You picked specific numbered items from the menu.** Removed all ambiguity about scope. I know exactly what's in and what's out without a second round-trip.
2. **You named the workflow constraint** ("each in a separate build step, so I can revert"). That's the real instruction — the *sequencing* matters as much as the *what*. Without it I'd have batched these into 3-4 builds for efficiency, which would have made revert messy.
3. **You inverted the default.** Most operators say "ship them all, I'll review at the end." You said "ship one, let me see, repeat." That's the right loop for taste calibration — short feedback cycles, atomic reverts.

Sharpener: naming the **revert criterion** would tighten step-by-step iteration even more. Template:

```text
Ship step-by-step. Revert if [criterion]. Continue if [criterion].
```

Example:
```text
Ship one at a time. Revert if it fights existing patterns or feels decorative.
Continue if it makes the surface feel calmer or more premium.
```

The **"Revert if / Continue if" pair** is the underused construct on iterative-build prompts — it tells me the *axis* you'll judge each step against, so I can pre-filter my implementation choices to favor that axis. Without it I optimize for "looks cool"; with it I optimize for your stated standard.

## Further enhancement suggestion

For **multi-step iterative builds** specifically, the highest-leverage frame is:

```text
Sequence: [list]. One at a time. 
Revert criterion: [what fails it]. 
Stop the whole sequence if: [bigger failure mode].
```

Example:
```text
Sequence: 1A, 1C, 1D, 2A, 2B, 2D, 3A, 3B, 3C, 4A, 5B. One at a time.
Revert criterion: feels decorative or fights existing patterns.
Stop the sequence if: cumulative effect makes the dashboard feel busy.
```

Three lines, three constraints. The **"Stop the whole sequence if" clause** is the underused construct on long iterative builds — it gives me a kill switch for the *aggregate* effect, not just per-step. Polish stacks; sometimes step 8 is fine alone but the combination of 1+3+7+8 tips into "too much." This clause lets you halt cleanly before that point.

