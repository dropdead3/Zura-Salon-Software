

## Goal
Filter out zero-revenue performers from the displayed list and the "view all" count, so the card only shows people who actually contributed in the selected mode (Service or Retail). Replace empty positions with a calm message.

## What's wrong
`sorted` includes every staff member regardless of whether they sold anything. Result: rank 3 shows "Sarah Spencer · $0", and "View all 12 stylists" implies hidden contributors when most are also at $0.

## Fix
In `src/components/dashboard/sales/TopPerformersCard.tsx`:

1. **Filter `sorted` to only include performers with `displayValue > 0`** for the active sort mode. This becomes the single source of truth — `displayList`, `hasMore`, the count in the toggle label, and `totalTeamRevenue` all derive from the filtered list.

2. **Render contextual empty/partial messages**:
   - If `sorted.length === 0` → show "No staff had {service revenue | retail sales} in this period."
   - If `sorted.length < 3` → render the actual performers, then below the list show a muted line: "No other staff had {service revenue | retail sales}."

3. **Hide the "View all N stylists" toggle** when `sorted.length <= INITIAL_COUNT` (already the behavior via `hasMore`, but now `sorted` excludes zeros so the count reflects real contributors only).

4. **Toggle label updates**: Since `sorted.length` now = real contributors, "View all 4 stylists" instead of "View all 12 stylists" — accurate.

## Behavior matrix

| Contributors | Display |
|---|---|
| 0 | Empty state: "No staff had retail sales in this period." |
| 1–2 | Show real performers + muted footer "No other staff had retail sales." No toggle. |
| 3 | Show 3 real performers. No toggle. |
| 4+ | Show top 3 + "View all N stylists" (N = real contributors only) |

## Out of scope
- Changing how `performers` is sourced upstream
- Switching messages per persona / role
- Adjusting the share % math (already divides by filtered total once filter applies)

## Files
- **Modify**: `src/components/dashboard/sales/TopPerformersCard.tsx` (filter logic + conditional footer message)

