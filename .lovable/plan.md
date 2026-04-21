

# Disambiguate "Breakdown by category"

## The confusion

The section currently shows:

```
Team        17       Client     12
Extensions  10       Financial  3
Facility    3        Management 4
```

The bare category labels read like entity counts at a glance — "17 team members", "3 facilities" — when each number is actually **the count of policies in that category** that will be adopted into the operator's starter set.

## The fix

Two surgical copy/structure changes in `src/components/dashboard/policy/PolicySetupWizard.tsx`, lines 859–874. No new components, no token changes, no logic changes.

### 1. Sharpen the section label (line 861)

**Before:** `Breakdown by category`
**After:** `Policies by category`

"Policies by category" names the unit (policies) directly, so the numbers below are pre-framed as policy counts before the eye reaches them.

### 2. Add a unit suffix to each row (line 869)

**Before:** each tile renders `<span>{count}</span>` — just the bare number.
**After:** render `{count} {count === 1 ? 'policy' : 'policies'}` so a tile reads `Team — 17 policies` instead of `Team — 17`.

To keep the tabular alignment clean (numbers right-aligned was the original intent), the right span becomes a two-part inline: the count in `text-foreground` (kept as the visual anchor), then ` policies` in `text-muted-foreground text-xs` so the unit is present but visually subordinate. Reads as one phrase, scans as a number.

Result:

```
Team           17 policies     Client       12 policies
Extensions     10 policies     Financial     3 policies
Facility        3 policies     Management    4 policies
```

### 3. Optional micro-helper above the grid

Add one line of advisory copy between the section label and the grid:

> `Counts of recommended policies in each category — not headcount or location counts.`

`font-sans text-xs text-muted-foreground`. Single sentence, matches the "Adopting a policy creates a draft…" footer copy already on the same panel. Belt-and-suspenders for the operator who scans without reading.

## Acceptance

1. Section heading reads "Policies by category" (not "Breakdown by category").
2. Each tile reads `<Category> — <N> policies` (singular `policy` for N=1).
3. A one-line muted helper sits between the heading and the grid, explicitly stating these are policy counts, not entity counts.
4. No grid layout changes, no token changes, no new state, no new components.
5. Visual hierarchy preserved — count stays the visual anchor (foreground), unit word reads as quiet context (muted, smaller).

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — lines 859–874 only.

## Doctrine compliance

- **Copy governance**: advisory-first ("Counts of recommended policies…"), no shame, names the unit so the operator never has to guess.
- **Silence**: one helper sentence replaces ambiguity; no tooltip, no icon, no modal.
- **UI canon**: keeps `tokens.kpi.label` for the heading (Termina), `font-sans` for body and unit suffix, no font-weight escalation.
- **Calm density**: the count remains the visual anchor; the unit word is muted so the grid still scans as a number table, just an unambiguous one.

## Prompt feedback

"The breakdown by category section needs a bit more clarity since at first glance, users will assume it's stating they have 17 team members and 3 facilities" — strong prompt. You named the surface, named the misread ("17 team members", "3 facilities"), and let me infer the fix shape. That's the gold-standard frame for a copy/clarity bug: **here's the surface + here's the false interpretation a user will form**. I didn't have to guess what was confusing — you handed me the misread directly, which is the hardest part of UX bug reports.

One small sharpener for next time: when you've already diagnosed the misread, you can also signal **how strong the fix should be**. Three escalation tiers exist for ambiguity bugs:

- **Light** — just relabel ("Policies by category")
- **Medium** — relabel + add unit to each row ("17 policies")
- **Heavy** — relabel + units + an explicit disambiguator sentence ("not headcount")

I went Heavy because the misread you described is concrete and behaviorally costly (an operator might dismiss the panel thinking "I don't have 17 team members, this is wrong"). But a phrase like "minimal fix" or "belt-and-suspenders" tells me which tier to target without me defaulting to the most defensive option. For this one, Heavy is right — but worth knowing you can dial it.

