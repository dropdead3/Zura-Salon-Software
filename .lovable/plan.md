

## Enterprise-Scale Drill-Down Lists: UI Strategy

Good question -- and good prompt framing. You identified the core UX scaling problem before it hits production. That's exactly the kind of structural thinking the platform doctrine calls for ("never expose enterprise complexity to solo operators").

### The Problem

The current "Click for breakdown" pattern expands inline with `AnimatePresence` + `height: auto`. For a 2-location salon with 5 stylists, this is fine. For a 40-location enterprise with 200+ stylists, the expanded list pushes the rest of the dashboard off-screen, breaking the calm executive UI.

This affects three surfaces:
- Tips by Stylist (TipsDrilldownPanel)
- Top Performers / Revenue by Stylist (useSalesByStylist results)
- Any future per-stylist drill-down (Avg Ticket, Utilization, etc.)

### Proposed Pattern: Constrained Scroll + Progressive Disclosure

Rather than a full redesign, apply two constraints to the existing inline expansion:

**1. Max-height with ScrollArea**

Wrap the stylist list in a `ScrollArea` with `max-h-[400px]` (roughly 8-10 rows visible). This caps the visual footprint regardless of staff count. The existing `Show all X stylists` toggle still works -- it just reveals more rows inside the scroll container instead of extending the page.

```text
┌─────────────────────────────────────┐
│  $ TIPS BY STYLIST  (tips earned)   │
│─────────────────────────────────────│
│  > SM  Staff A    $228   80%  3apt  │
│  > SM  Staff B    $183   76%  3apt  │
│  > SM  Staff C    $97    22%  3apt  │
│  > SM  Staff D    $23    13%  3apt  │
│  > SM  Staff E    $20     4%  6apt  │
│  > SM  Staff F    $18     3%  4apt  │  ← scrollable
│  > SM  Staff G    $15     2%  5apt  │
│  > SM  Staff H    $12     2%  3apt  │
│     ↓ scroll for more              │
│─────────────────────────────────────│
│  Show all 47 stylists              │
└─────────────────────────────────────┘
```

**2. Location grouping for multi-location orgs**

When `is_multi_location` is true and the location filter is set to "All Locations," group stylists by location with collapsible headers. Each location section shows its top performers, collapsed by default. This reduces initial visual load from 200 rows to ~5-10 location headers.

```text
┌─────────────────────────────────────┐
│  $ TIPS BY STYLIST  (tips earned)   │
│─────────────────────────────────────│
│  ▸ Val Vista Lakes  (12 stylists)   │
│  ▾ North Mesa       (8 stylists)    │
│     SM  Staff A    $228   80%  3apt │
│     SM  Staff B    $183   76%  3apt │
│     SM  Staff C    $97    22%  3apt │
│     ... Show all 8                  │
│  ▸ Scottsdale       (15 stylists)   │
│  ▸ Chandler         (11 stylists)   │
└─────────────────────────────────────┘
```

When a specific location IS selected, the list stays flat (current behavior) since it's already scoped.

### What Changes

| File | Change |
|---|---|
| `src/components/dashboard/sales/TipsDrilldownPanel.tsx` | Wrap stylist lists in `ScrollArea` with `max-h-[400px]`. Add location-grouped view when `isMultiLocation && effectiveLocationId === 'all'`. Use `Collapsible` for each location group. |
| `src/components/dashboard/AggregateSalesCard.tsx` | No change needed -- the panel is self-contained. |

### What This Does NOT Change

- Single-location orgs see no difference (list is short, no grouping needed)
- The "Show all X stylists" button remains for the flat view
- Expanded stylist visit cards still render inline within their row
- Existing persona scaling (VisibilityGate) and role filtering are unaffected

### Technical Detail

The `ScrollArea` component from `@/components/ui/scroll-area` is already in the project and uses Radix primitives with the design token scrollbar styling. The `Collapsible` component from `@/components/ui/collapsible` is also available. Both are zero-new-dependency additions.

For grouping, `filteredTotalTips` already carries `locationId` per stylist. We group by `locationId`, resolve location names from the existing `useActiveLocations` hook (already imported), and render each group inside a `Collapsible`. The top 3 stylists per location are shown by default; "Show all" expands the rest within that group.

### Enhancement Suggestions

- Apply the same ScrollArea constraint to the Top Performers card and any future per-stylist drill-down for consistency.
- Consider a "Search staff" input at the top of the list for enterprises with 50+ staff, allowing quick name lookup without scrolling.
- For the Avg Tip Rate Ranking section, the same grouping logic should apply to keep the two lists visually consistent.

