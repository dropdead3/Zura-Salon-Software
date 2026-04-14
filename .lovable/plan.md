

# Enhance Hardware Tab — Proper Order History with Delivery Details

## Problem
The current order history is a minimal inline list at the bottom of the order card. It doesn't show which device model was ordered, delivery destination details, or provide clear visual hierarchy for tracking shipped/delivered orders.

## Changes

### `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

**Extract Order History into its own Card** below the Order Terminal card:

- New `Card` with `Package` icon, title "Order History", and description "Track your terminal orders and deliveries"
- Each order row becomes a richer layout showing:
  - **Device model**: Display `device_type` (S700/S710) with the correct model icon (`Wifi`/`Signal`) — falls back to "Reader" if not set
  - **Quantity**: Show `× N` when quantity > 1
  - **Accessories**: List accessory names from the JSONB `accessories` column
  - **Delivery location**: Resolve `location_id` against the `locations` prop to show the location name — labeled as "Ship to: Location Name"
  - **Order date**: Formatted with `date-fns`
  - **Estimated total**: From `estimated_total_cents`, formatted via `useFormatCurrency`
  - **Tracking number**: Show as a monospace badge when present (could link to carrier tracking later)
  - **Status badge**: Existing `REQUEST_STATUS_CONFIG` with colored badge and icon
- **Empty state**: When no orders exist, show a centered empty state with `Package` icon and "No terminal orders yet" message
- **Loading state**: Skeleton rows

**Remove** the inline order history from inside the Order Terminal card (lines 309-348) and move it to the new dedicated card.

### No new files or hooks needed
All data is already fetched via `useTerminalRequests`. The `locations` prop is already passed in.

## What Users See
- Order Terminal card stays clean — just model selection and ordering
- Below it, a dedicated Order History card with full details per order: model, location, tracking, cost, status
- Empty state when no orders have been placed

