

## Add "Client Since" and "Last Visit" to Client Search Cards

### What changes

**`src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Expand client query**: Add `client_since` to the select on the `phorest_clients` query (line 240) and update the `PhorestClient` interface to include `client_since: string | null`.

2. **Add a lightweight last-visit lookup**: Create a small React Query hook inside `ClientRow` (or a shared sub-query) that fetches the most recent `appointment_date` from `phorest_appointments` for the client's `phorest_client_id`, filtered to real visits (`is_demo = false`, completed/confirmed statuses). This avoids N+1 by only firing for visible rows.

3. **Format durations as human-readable**: Use `formatDistanceToNow` (already imported) to render:
   - **Client since**: e.g. "Client since · 2 years" or "Client since · 3 months" from `client_since`
   - **Last visit**: e.g. "Last visit · 5 weeks ago" from the appointment query
   - If `client_since` is null: "No history on record"
   - If last visit is null: "No visits on record"

4. **Update `ClientRow` UI**: Below the name/phone line, add a subtle third line with the two data points separated by a dot, in muted text at `text-[10px]`.

### Technical details

- `PhorestClient` interface gets `client_since: string | null`
- Client search select becomes `'id, phorest_client_id, name, email, phone, client_since'`
- `ClientRow` gets an inline `useQuery` for last visit date (staleTime: 60s, enabled when `phorest_client_id` exists)
- Duration formatting: `formatDistanceToNow(date, { addSuffix: false })` for clean output like "2 years", "3 months", "5 weeks"

