

## Redesign Dock Client Step: Search-First + Recent Check-Ins

### Problem
The current client step shows a blank "type 2 chars" prompt. In reality, walk-in clients have usually already been added by the front desk or checked themselves in at the kiosk. The stylist should see these recent check-ins immediately — no typing required — and only fall back to search or "Create New" for the rare truly-new client.

### Changes

**1. Add a "Recent Check-Ins" query to `DockNewBookingSheet.tsx`**
New `useQuery` that fetches today's check-ins for the current location by joining `appointment_check_ins` → `phorest_clients` (via `phorest_client_id`). Ordered by `checked_in_at DESC`, limited to ~20. Also includes today's appointments with `status = 'checked_in'` from `phorest_appointments` as a fallback source. Returns client name, phone, email, check-in time, and method (kiosk/front-desk).

**2. Redesign `ClientStepDock` layout**
Replace the current "type 2 chars" empty state with a two-section layout:
- **Search bar + New Client button** (stays at top, same as now)
- **When no search query**: Show "Recent Check-Ins" section — a list of today's checked-in clients at this location, each with a green dot indicator, name, check-in time ("12m ago"), and method badge ("Kiosk" / "Front Desk"). Tapping selects them.
- **When searching**: Show search results as before (overlays the check-ins list)
- **"+ New Client" button** moves to a smaller inline prompt at the bottom of the check-ins list ("Don't see them? Create new client")

**3. Wire the data flow**
- Pass `recentCheckIns` and `isLoadingCheckIns` as new props to `ClientStepDock`
- Each check-in row maps to a `PhorestClient` shape so `onSelectClient` works unchanged
- For demo mode with real data, the same query runs scoped to `organizationId`

### Technical details

| Aspect | Detail |
|--------|--------|
| Query | `appointment_check_ins` where `location_id = locationId` and `checked_in_at >= today`, joined to `phorest_clients` on `phorest_client_id` |
| Fallback | Also query `phorest_appointments` with `status = 'checked_in'` and `appointment_date = today` for the same location |
| Dedup | Deduplicate by `phorest_client_id` (same client may check in for multiple services) |
| Time display | Relative time ("5m ago", "1h ago") using simple math on `checked_in_at` |
| Method badge | Small pill: "Kiosk" (green) or "Front Desk" (blue) based on `check_in_method` |
| File | `src/components/dock/schedule/DockNewBookingSheet.tsx` only |

