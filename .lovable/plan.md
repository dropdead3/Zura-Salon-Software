

# Clean Up Operations Hub Cards: Equal Size + Center-Center Layout

## Problem
The current `ManagementCard` layout uses a left-aligned horizontal flex (icon left, text right, chevron far right). Cards vary in height based on content length, and the layout feels inconsistent — especially when sections have 1-2 cards that stretch unevenly across the grid.

## Design Change
Convert all Operations Hub cards to a **center-center stacked layout**: icon centered on top, title centered below, description centered beneath that. Remove the inline chevron (it adds visual noise and breaks centering). Enforce a fixed minimum height so all cards in a row are equal.

## File Changes

| # | File | Change |
|---|---|---|
| 1 | `src/pages/dashboard/admin/TeamHub.tsx` — `ManagementCard` (lines 86-128) | Restructure card content from horizontal flex to vertical centered stack: icon box centered → title centered → description centered. Remove `ChevronRight`. Remove `items-center justify-between` flex row. Add uniform `min-h-[140px]` and `flex flex-col items-center justify-center text-center`. Move the stat badge below description. Keep the star/favorite button absolutely positioned top-right. |
| 2 | `src/pages/dashboard/admin/TeamHub.tsx` — `HubGatewayCard` (lines 140-174) | Apply the same center-center stacked layout for consistency. Remove `ChevronRight`. |
| 3 | `src/pages/dashboard/admin/TeamHub.tsx` — `renderFavoriteCard` (lines 301-323) | Apply the same center-center layout to favorite cards. Keep the amber styling. |

## Card Structure (After)

```text
┌──────────────────────────┐
│                    ★     │  ← star top-right (abs positioned)
│                          │
│       ┌──────────┐       │
│       │   Icon   │       │  ← icon box centered
│       └──────────┘       │
│     CARD TITLE HERE      │  ← font-display, centered
│  Description text here   │  ← text-xs muted, centered
│       [2 pending]        │  ← badge if present
│                          │
└──────────────────────────┘
```

## Result
- All cards render at equal height within each row via `min-h-[140px]` + grid `items-stretch`
- Content is vertically and horizontally centered — clean, cohesive, scannable
- Consistent across regular cards, hub gateway cards, and favorited cards

