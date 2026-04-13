

# Equalize All Operations Hub Cards

## Problem
Cards vary in height because some have stat badges and others don't. The `min-h-[140px]` helps but doesn't fully equalize when badges add extra content. Additionally, favorite cards lack the description line, making them shorter.

## Changes

| # | File | Change |
|---|---|---|
| 1 | `src/pages/dashboard/admin/TeamHub.tsx` — `ManagementCard` | Change `min-h-[140px]` to a fixed `h-[160px]` so all cards are identical height regardless of badge presence. Ensure the content uses `justify-center` with a fixed structure (icon → title → description always rendered, badge overlaid or placed in reserved space). |
| 2 | `src/pages/dashboard/admin/TeamHub.tsx` — `HubGatewayCard` | Apply same fixed `h-[160px]` for parity with ManagementCard. |
| 3 | `src/pages/dashboard/admin/TeamHub.tsx` — `renderFavoriteCard` | Apply same fixed `h-[160px]`. Add an empty description placeholder so the visual weight matches other cards. |
| 4 | `src/pages/dashboard/admin/TeamHub.tsx` — `CategorySection` | Standardize all sections to `lg:grid-cols-3` (remove the `columns` prop variation) so every row has the same column width. Keep `items-stretch` on the grid. |

## Result
Every card across every section — management, hub gateway, and favorites — renders at exactly the same width (1/3 of grid) and height (160px), creating a clean, uniform, scannable grid.

