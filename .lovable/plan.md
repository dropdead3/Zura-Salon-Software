

# Restructure Pricing Section — Single Configurator Card

## Problem
The current pricing section splits related information across **3 separate cards** with no visual connection:
1. Price tiles + annual ROI projection (confusingly mixed)
2. Location selector (affects numbers in card 1 but lives separately)
3. Scale hardware (separate card, also affects totals)

The user has to mentally connect three disconnected cards to understand what they're paying. The ROI projection sits inside the static pricing card, making it unclear that it's dynamic and based on selections below.

## Solution
Consolidate into a **single configurator card** using the checkout/cart pattern: configuration inputs at the top, dynamic cost summary at the bottom. One card, one flow, one total.

### Layout (top to bottom, inside one Card)

```text
┌─────────────────────────────────────────────────┐
│  PRICING                                         │
│                                                   │
│  $20/mo per location  ·  $0.50 per color service │
│  "One highlight covers your monthly cost"         │
│                                                   │
│  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───   │
│                                                   │
│  📍 Locations                    [Select All]     │
│  ☑ Downtown Studio         +$20/mo                │
│  ☑ Midtown Salon           +$20/mo                │
│                                                   │
│  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───   │
│                                                   │
│  ⚖ Scales           [$199 one-time · $10/mo ea]  │
│  2 recommended       [−] 2 [+]                    │
│  iPad + Bluetooth required                        │
│                                                   │
│  ═══════════════════════════════════════════════  │
│                                                   │
│  Monthly Summary                                  │
│  2 locations              $40                     │
│  2 scales                 $20                     │
│  Est. usage (~84 svc)     $42                     │
│  ────────────────────────────                     │
│  Est. Monthly Total       $102/mo                 │
│  One-time hardware        $398                    │
│                                                   │
│  ┌─ success banner ────────────────────────────┐  │
│  │  Projected Annual Impact: +$4.2K/yr · 4× ROI│  │
│  │  ████████░░ Cost is 25% of annual benefit   │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Key Changes

1. **Merge 3 cards → 1 card** with internal `border-t border-border/40` dividers between sections
2. **Price headline** becomes a compact inline statement at top (not two big tiles)
3. **Location selector** moves into the card as the first config section
4. **Scale selector** becomes the second config section (compact: recommendation + stepper on one row, price note inline)
5. **Cost summary** at bottom — itemized line items like a receipt, with clear labels and right-aligned amounts
6. **ROI projection** moves to the very bottom of the card, after the summary — it's the payoff after seeing the cost, not mixed in with static prices
7. **Hardware one-time cost** shown as a separate line in the summary (not buried in scale tiles)

### Files
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — rewrite Section 7 (lines 803–1033)

