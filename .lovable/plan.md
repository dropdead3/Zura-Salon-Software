

# Enhanced Setup Step Tracker in Banner

## What Changes

Replace the single progress bar + "1 of 6 areas configured" text with a **6-step tracker** showing each area as a dot/circle with its label. Completed steps get a filled amber dot + check; incomplete steps get an empty dot. Steps are connected by a horizontal line segment.

**The 6 steps** (derived from `useBackroomSetupHealth`):
1. Products
2. Services
3. Recipes
4. Allowances
5. Stations
6. Alerts

## Responsive Behavior

Uses a CSS container query on the banner so layout adapts to the banner's actual width (not viewport):

- **Wide** (≥600px): Dots + labels + connecting lines visible
- **Narrow** (<600px): Labels hidden, only dots + lines remain; the "X of 6" text above still provides context

## Implementation

**File: `BackroomDashboardOverview.tsx`** (lines 100–132, the setup banner Card)

1. Define the 6 steps array inline with labels and a boolean derived from `setupHealth`:
   ```ts
   const steps = [
     { label: 'Products', done: setupHealth.trackedProducts > 0 },
     { label: 'Services', done: setupHealth.trackedServices > 0 },
     { label: 'Recipes', done: setupHealth.recipesConfigured > 0 },
     { label: 'Allowances', done: setupHealth.allowancePolicies > 0 },
     { label: 'Stations', done: setupHealth.stationsConfigured > 0 },
     { label: 'Alerts', done: setupHealth.alertRulesConfigured > 0 },
   ];
   ```

2. Replace the `<Progress>` bar (line 111) with a horizontal step tracker:
   - Each step: a small circle (amber-filled + check when done, border-only when not) with a label below
   - Between steps: a thin connecting line (amber when preceding step is done, muted otherwise)

3. Wrap the banner content area in `@container` so labels hide at narrow widths:
   - Add `style={{ containerType: 'inline-size' }}` on the card content wrapper
   - Labels get class `hidden @[600px]:block` to show only when container is ≥600px

4. Keep the "X of 6 areas configured" text as the heading above the step tracker.

Single file change. No new components or hooks needed — `setupHealth` already exposes all the per-area counts from `useBackroomDashboard`.

