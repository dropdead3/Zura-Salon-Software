

## Client Quick-View Card on Confirm Step

Add a compact "last visit" summary card below the client name on the confirm step, showing key context at a glance before booking.

### What it shows
- **Last visit date** + time since (e.g., "Feb 14 · 5 weeks ago")
- **Last stylist seen** (resolved from `phorest_staff_mapping` → `employee_profiles`)
- **Last location visited**
- **Last service** 
- **Total visit count**
- "New client" badge if no prior visits

### Implementation

**Single file: `src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Add a query inside `ConfirmStepDock`** that fetches the client's last completed appointment from `phorest_appointments` using `client.phorest_client_id`:
   - Select `appointment_date`, `service_name`, `location_id`, `phorest_staff_id`, and count total visits
   - Join to `phorest_staff_mapping` → `employee_profiles` for stylist name
   - Join to `locations` for location name
   - Filter `.eq('is_demo', false)` to exclude demo bookings, order by `appointment_date desc`, limit 1

2. **Render a compact card** between the client header and the details section:
   - If loading: subtle skeleton
   - If no visits: a small "New Client ✨" badge
   - If visits exist: a small muted card with 2–3 lines: `"Last visit: Feb 14 (5w ago) · Balayage · with Sarah M. at North Mesa"` and `"12 visits total"`

3. **Use `formatDistanceToNow`** from `date-fns` for relative time.

4. **Pass `phorest_client_id`** through the `client` prop (already available on the `PhorestClient` interface).

No new files, no schema changes. One query + one UI card added to the existing confirm step component.

