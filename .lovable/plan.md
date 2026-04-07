

# Add Service Pricing Visibility to Progression Ladder

## Context

The "My Progression Path" ladder currently shows commission rates and KPI thresholds for each level, but stylists can't see how their **service prices** change as they advance. The `service_level_prices` table already has this data (e.g., "Buzz Cut" goes from $35 at New Talent to $61 at Signature Artist). Surfacing this gives stylists a tangible financial incentive to progress.

## Design

Each level card in the ladder gets an expandable "Service Pricing" section. Clicking it reveals a compact table of services and their prices at that level. To keep the ladder clean, this is collapsed by default and toggled via a small "View pricing" link.

For the stylist's **current level**, prices are shown as-is. For **future levels**, prices show the delta vs. current level (e.g., "$61 (+$26)") so the stylist can immediately see the financial upside.

Only services that have level-differentiated pricing are shown (i.e., services where the price actually varies across levels). Flat-price services like consultations are excluded to reduce noise.

## Implementation

### 1. New hook: `useAllServiceLevelPrices`
A lightweight query that fetches all `service_level_prices` joined with `services.name` for the org. Returns a map of `levelId → Array<{ serviceName, price }>`.

Could alternatively extend `useBookingLevelPricing` but a separate read-only hook is cleaner for this use case.

### 2. Update `LevelProgressionLadder.tsx`

**Data layer:**
- Import the new hook
- Build a `Map<levelId, ServicePriceRow[]>` from the query results
- Determine the current level's prices as the baseline for delta calculations

**UI additions per level card:**
- Below the criteria highlights section, add a collapsible "Service Pricing" toggle (Collapsible from Radix or simple state toggle)
- When expanded, render a compact two-column list: service name | price
- For future levels: show price with a green `+$X` delta badge
- For current level: show prices without delta
- For past levels: show prices dimmed (consistent with existing opacity treatment)
- All prices wrapped in `BlurredAmount` for financial privacy

**Visual treatment:**
- Toggle link: `text-[11px] text-muted-foreground` with a ChevronDown icon
- Price list: compact `text-[11px]` rows, no borders, subtle `bg-muted/30` background
- Delta badges: `text-emerald-500 text-[10px]`

### 3. Files changed

| File | Change |
|------|--------|
| `src/components/dashboard/LevelProgressionLadder.tsx` | Add pricing toggle, price list UI, delta calculations |
| New: `src/hooks/useServicePricesByLevel.ts` (or inline query) | Fetch service_level_prices + service names for the org |

No database changes needed — all data already exists.

