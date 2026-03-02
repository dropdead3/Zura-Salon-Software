

## Standardize Card Sizes on Operations Hub

The two card types (`HubGatewayCard` and `ManagementCard`) currently differ in padding and alignment, creating visual inconsistency.

### Changes (single file: `TeamHub.tsx`)

1. **Unify `HubGatewayCard` padding** from `p-6` to `p-5` to match `ManagementCard`
2. **Unify `HubGatewayCard` layout** from `items-center` to `items-start` to match `ManagementCard` structure
3. **Add `min-h` to both card types** -- apply a shared minimum height (e.g., `min-h-[88px]` on CardContent) so cards with one-line vs two-line descriptions remain the same size within their grid row
4. **Align description spacing** -- `HubGatewayCard` uses `mt-1`, `ManagementCard` uses `mt-0.5` -- normalize both to `mt-0.5`
5. **Add `line-clamp-2`** to `HubGatewayCard` description (already present on `ManagementCard`) for consistent text truncation

### Result
All cards across every section will share identical padding, alignment, description clamp, and minimum height.

