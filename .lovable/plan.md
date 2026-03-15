

# Tier Progression Indicator on Location Rows

## Overview

Add a compact visual indicator to each location row in the Backroom Paywall showing how close the location is to the next tier threshold. This helps owners anticipate pricing changes as they hire.

## What It Looks Like

Below the existing stylist count + tier badge line, add a thin progress bar with contextual text:

- **At threshold boundary** (e.g., 3/3 stylists on Starter): amber progress bar at 100%, text: "Add 1 more stylist → Professional ($79/mo)"
- **Mid-tier** (e.g., 6/10 on Professional): muted progress bar at 60%, text: "4 more stylists to Unlimited"
- **Already on Unlimited**: no indicator (no next tier)

## Changes

### 1. Add `getTierProgressInfo()` helper to `useLocationStylistCounts.ts`

Pure function that takes a stylist count and returns:
```ts
{ currentTier, nextTier, currentCount, thresholdMax, remaining, progressPct, isAtBoundary }
```

Thresholds: Starter 1–3, Professional 4–10, Unlimited 11+. Returns `null` for Unlimited (no next tier).

### 2. Update location row in `BackroomPaywall.tsx` (lines ~377-414)

After the existing stylist count + tier badge row, conditionally render:
- A `Progress` bar (h-1, muted color, amber when `isAtBoundary`)
- A one-line text hint using the helper output

Only show when `getTierProgressInfo` returns non-null (i.e., not already on Unlimited).

## Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useLocationStylistCounts.ts` | Add `getTierProgressInfo()` export |
| `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` | Add progress indicator to location rows |

