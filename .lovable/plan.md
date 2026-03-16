

# Enhance Backroom Paywall for Sales Conversion & Clarity

## Problem
The current page jumps straight into loss numbers without explaining what Zura Backroom actually is. A salon owner landing here doesn't get a clear product definition or value proposition before being hit with financial data.

## Changes (`BackroomPaywall.tsx`)

### 1. New Hero — Product Definition
Replace the current generic "Stop Losing Money" hero with a clear product statement:

**Headline:** "Zura Backroom"
**Subline:** "Color room management and resupply intelligence that reduces waste and increases revenue."
**Supporting line:** "Track every gram dispensed, eliminate ghost losses, recover supply costs, and know what to reorder before you run out."

This immediately tells the owner *what it is* (color room management tool) and *why they want it* (reduce waste, increase revenue).

### 2. Add "How It Works" Section Before the Loss Banner
Insert a concise 3-step visual flow between the hero and the loss aversion banner:

```
1. Weigh & Track          2. Detect & Reduce         3. Recover & Reorder
Every color service       Ghost losses, waste,        Bill supply costs back
is measured on a          and variance are             to clients. Predictive
precision scale.          flagged automatically.       reorder before stockouts.
```

This gives the owner a mental model of the product *before* the financial pitch.

### 3. Rewrite Feature Cards for Clarity
Current feature cards use abstract labels. Rewrite with plain language that a salon owner understands:

| Current | New Title | New Description |
|---------|-----------|-----------------|
| Predictive Stock Intelligence | Know Before You Run Out | See tomorrow's color needs based on your appointment book. No more end-of-night counting. |
| Recipe & Mixing | Track Every Formula | Record what's mixed, measure what's used, and see what's wasted — per stylist, per service. |
| Cost Intelligence | See Your True Product Costs | Wholesale price tracking, markup calculations, and cost-per-service visibility across every brand. |
| Waste & Compliance | Stop Invisible Losses | Ghost loss detection, reweigh compliance tracking, and variance alerts that catch problems early. |

### 4. Strengthen the Loss Aversion Banner Copy
- Change "Money You May Be Losing Every Month" → "What Your Color Room Is Costing You Right Now"
- Change sub-copy from "Without Zura Backroom, these costs go undetected and unrecovered" → "Most salons have no visibility into color room costs. Here is what the data shows for yours."

### 5. Add a "What You Get" Summary Above Location Selector
A short bulleted list that bridges features → action:
- Precision scale integration at every station
- Per-gram dispensing and waste tracking
- Automated supply fee recovery
- Predictive reorder alerts
- Cost-per-service analytics

### 6. Minor Copy Improvements
- "Time Your Team Loses Every Day" header → "Time Your Team Spends on Manual Inventory" (more specific)
- Sub-copy: "Nightly counts, guessing stock levels, manual audits — replaced by predictive intelligence." → "Nightly tube counts, manual stock checks, and guessing what to reorder — all replaced by automated tracking."
- ROI callout: "Backroom pays for itself X× over" → "Your color room pays you back X× over"

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` | Modify — hero rewrite, add How It Works section, rewrite features, strengthen copy throughout |

