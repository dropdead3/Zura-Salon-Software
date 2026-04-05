

# Improve ChaosToClarity Section — Better Visibility and More Chaos Items

## Problem

The "chaos" side is too dark and low-contrast — the cards blend into the background making the content hard to read. The section also needs more relatable salon problems (without Zura branding).

## Changes

### `src/components/marketing/ChaosToClarity.tsx`

**1. Visual improvements to chaos side**
- Increase card background opacity: `bg-slate-800/70` instead of `bg-slate-900/80`
- Bump border contrast: `border-white/[0.12]` instead of `0.08`
- Increase text brightness: `text-slate-300` instead of `text-slate-400` for labels
- Increase container background: `bg-white/[0.04]` instead of `0.02`
- Make noise dots brighter or remove them (they add visual noise without value)

**2. Expand chaos cards from 6 to 10+**

Add more real operator pain-point items:

| Icon | Label | Color |
|------|-------|-------|
| Clock | "Where did my 2pm cancel go?" | slate-400 |
| DollarSign | "Commission math doesn't add up" | red-400 |
| Users | "3rd no-call no-show this month" | amber-400 |
| ShoppingBag | "Who ordered more Redken?" | slate-400 |
| Phone | "Missed 4 calls while cutting" | amber-500 |

These are all generic salon operator frustrations — no Zura references.

**3. Adjust card positioning**

Redistribute positions across the container to accommodate the additional cards without overlap, using a tighter grid of `x`/`y` percentages and varied rotations.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/ChaosToClarity.tsx` | **Modify** — brighten card styles, expand `chaosCards` array with 5 new entries, reposition all cards |

**1 file modified.**

