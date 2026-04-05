

# Add Zura Color Bar Suggestions to Struggle Input

## Problem

The current suggestion pills are generic salon management pain points. None specifically reference the **Zura Color Bar** app — a core product with its own mixing station, inventory tracking, waste analytics, and cost-per-service intelligence.

## Changes

### `src/components/marketing/StruggleInput.tsx`

Add 4 Color Bar-specific suggestions to the `SUGGESTIONS` array:

1. "I'm losing money on color and don't know how much"
2. "I need to track exactly how much product goes on each head"
3. "My stylists waste too much color"
4. "I want to know my true cost per color service"

These complement the existing "I need to track color bar costs per service" entry (already present) and speak directly to the Color Bar app's value props: waste reduction, per-service cost tracking, and margin visibility.

The typing animation cycles through all suggestions; the pill subset (5 shown) is randomly selected on mount, so Color Bar entries will naturally surface.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/StruggleInput.tsx` | **Modify** — add 4 Color Bar-specific strings to `SUGGESTIONS` array |

**1 file modified.**

