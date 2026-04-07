

# Add "Recommended Weights" Preset Button + Guidance Copy

## What This Does

Adds a one-click "Recommended" preset button next to "Distribute Evenly" that applies industry-standard weight distribution. Updates the explainer to acknowledge that revenue is typically the dominant driver.

## Recommended Weight Distribution

Based on salon industry norms — revenue is the primary lever, with retention and rebooking as supporting signals:

| Metric | Weight |
|---|---|
| Service Revenue | 40% |
| Retail Attachment | 10% |
| Rebooking Rate | 15% |
| Average Ticket | 10% |
| Client Retention | 15% |
| New Clients | 5% |
| Schedule Utilization | 5% |
| Revenue Per Hour | 0% (only if enabled) |

Logic: Only enabled metrics receive weights. If fewer metrics are enabled, the recommended values redistribute proportionally among those that are active.

## Technical Changes

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

**1. Add recommended weights map (~line 138)**

```ts
const RECOMMENDED_WEIGHTS: Record<string, number> = {
  revenue_weight: 40,
  retail_weight: 10,
  rebooking_weight: 15,
  avg_ticket_weight: 10,
  retention_rate_weight: 15,
  new_clients_weight: 5,
  utilization_weight: 5,
  rev_per_hour_weight: 0,
};
```

**2. Add "Recommended" button next to "Distribute Evenly" (~line 955)**

A second ghost button with a `Sparkles` icon labeled "Recommended". On click, it applies the recommended weights to enabled metrics and redistributes any remainder to ensure the total is exactly 100%.

**3. Update the explainer copy (~line 947)**

Add a sentence: "Most salons weight Service Revenue highest (40%+) since it's the clearest indicator of client demand and book strength. Use the Recommended preset for a proven starting point."

## Scope
- Single file: `GraduationWizard.tsx`
- ~25 lines added
- No database changes

