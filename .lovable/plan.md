

# Enhance Loss Aversion Card (Section 3)

## Problem
The card shows 3 scary red numbers and a slider but doesn't explain:
1. What each number actually represents or how it's calculated
2. What happens to these costs **after** implementing Backroom
3. The projected annual impact — the payoff of solving these problems

It's all pain, no resolution. The user sees "$431 product waste" but has no anchor for what that means or what they'd recover.

## Solution
Restructure into a **two-part card**: "What you're losing" (top) → "What you'd recover" (bottom), with clear explanatory subtitles on each stat and a projected annual impact banner at the bottom.

### Changes (all within lines ~460–535)

**1. Stat tiles — add explanatory subtitles**
Each of the 3 tiles gets a brief one-line explanation below the label:
- Product waste: "Unmeasured mixing leads to over-dispensing and leftover waste"
- Staff time wasted: "Manual counting, reordering, and inventory audits"  
- Unrecovered supply costs: "Color used but never billed back to services"

**2. Add "Projected Annual Recovery" banner below the slider**
A `bg-success/5 border-success/20` banner showing:
- Left side: total annual savings number (`yearlySavings = totalSavings * 12`) with label "Projected Annual Recovery"
- Right side: breakdown as 3 compact line items (waste reduction + time savings + supply recovery, per year)
- Footnote: "Based on your salon's current appointment volume"

This uses the already-calculated `wasteSavings`, `monthlyAuditCost`, `supplyRecovery`, and `totalSavings` values — no new data fetching needed.

**3. Section header — improve clarity**
- Change title from "What Your Color Room Is Costing You Right Now" to "Your Estimated Color Room Losses"
- Change subtitle to "These projections are based on your salon's actual appointment data and industry benchmarks."

**4. Slider label improvement**
- Change "Drag to adjust" to "Time your team spends on manual inventory tasks daily"

### File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — lines 460–535

