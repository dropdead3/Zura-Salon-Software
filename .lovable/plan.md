

# Visual Plan Cards for Billing Guide

Replace the current `subscription_plans` table (lines 121-171) with a visual card-based layout that makes the tier progression immediately scannable.

## Design

A horizontal row of 4 plan cards (responsive: stacks on mobile), each showing:
- Tier name + badge (e.g. "Most Popular" on Growth)
- Large price display ($99/mo or $200/loc/mo)
- Included users callout
- Location range
- 3-4 key feature bullets
- Visual tier progression indicator (subtle left border accent that intensifies per tier)

Uses existing `PlatformCard` with the design token system. Cards follow the bento radius hierarchy (rounded-xl outer, rounded-lg inner elements).

## Layout
```text
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ OPERATOR │ │  GROWTH  │ │  INFRA   │ │ENTERPRISE│
│          │ │ Popular  │ │          │ │          │
│  $99/mo  │ │ $200/loc │ │ $200/loc │ │  Custom  │
│  flat    │ │  /mo     │ │  /mo     │ │          │
│          │ │          │ │          │ │          │
│ 1 user   │ │ 10/loc   │ │ 10/loc   │ │ Custom   │
│ 1 loc    │ │ 2-5 locs │ │ 5+ locs  │ │ Unlim.   │
│          │ │          │ │          │ │          │
│ • feat   │ │ • feat   │ │ • feat   │ │ • feat   │
│ • feat   │ │ • feat   │ │ • feat   │ │ • feat   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Changes

**Single file**: `src/pages/dashboard/platform/BillingGuide.tsx`

1. Add a `PlanCards` component that renders 4 cards in a `grid sm:grid-cols-2 lg:grid-cols-4` layout
2. Each card: left border accent color (violet gradient intensity per tier), tier name, price hero, included users, location range, feature bullets pulled from plan data
3. Keep the existing table below as a collapsible "Detailed View" for full database fields, or remove it entirely since the cards convey the same info more clearly
4. Growth card gets a small "Most Popular" badge using `PlatformBadge`

No hook or database changes needed — purely a UI presentation improvement using existing plan data.

