
## Prompt review

Good — you named two specific pages and the symptom. Even sharper next time: which tab is slow first (Appointments or Transactions), what date range you have selected, and roughly how long it takes. Each tab has very different bottlenecks, so a leverage marker would let me fix the worst offender first instead of both at medium depth.

Better framing: "Appointments tab on the Hub takes ~4s to first paint with 'All' selected" or "Transactions tab is slow when I pick a busy day."

## Plan — Wave 16: Appointments & Transactions Hub Performance (P0)

Doctrine anchor: `high-concurrency-scalability`.

### What I found

| # | Finding | Tab | Priority |
|---|---|---|---|
| 1 | Both tab queries run on mount even though only one tab is visible (`useAppointmentsHub` + `useGroupedTransactions` always enabled) | Both | **P0** |
| 2 | `useAppointmentsHub` uses `select('*', { count: 'exact' })` on the union view — `exact` count forces a full filtered scan every page change | Appts | **P0** |
| 3 | `useAppointmentsHub` fans out **6 sequential follow-up queries** (clients, stylists, created_by, locations, local clients, transactions match) after the main page query | Appts | **P0** |
| 4 | Transactions "has_transaction / total_paid" lookup uses `.in(phorest_client_id, …).in(transaction_date, …)` — broad cross-filter against `v_all_transaction_items` | Appts | **P1** |
| 5 | `useGroupedTransactions` uses `select('*')` + paginates **all** rows for the day, including columns the table never reads | Txns | **P1** |
| 6 | `appointments` (afterpay) + `checkout_usage_charges` lookups in `useGroupedTransactions` run sequentially | Txns | **P2** |
| 7 | Tooltip `asChild` wrapping `Badge` causes the React ref warning seen in console (`AppointmentsList`) — minor render cost + log noise | Appts | **P2** |

### Implementation plan (P0 only)

**Fix #1 — Gate each tab's heavy query by `activeTab`:**
- Pass `enabled: activeTab === 'appointments'` into `useAppointmentsHub` (via prop on `AppointmentsList`)
- Pass `enabled: activeTab === 'transactions'` into `useGroupedTransactions`
- Eliminates the entire silent second query on first paint

**Fix #2 — Stop using `count: 'exact'` on the appointments hub query:**
- Switch to `count: 'estimated'` (or `'planned'`) for pagination footer — same UX, drops a full filtered scan
- Keep `exact` only when the user has narrowed by date range or status (small result set)

**Fix #3 — Reduce the appointments enrichment fan-out:**
- Run the 6 follow-up lookups in `Promise.all` instead of `await` chain (they're independent)
- Narrow `select('*')` on `v_all_appointments` to the columns the table actually renders (date, time, client_name, client_phone, client_email, service_name, stylist_user_id, staff_name, status, total_price, location_id, created_by, phorest_client_id, client_id, _source, deleted_at, id) — drops payload size materially
- Add `staleTime: 60_000` (currently 30s) on appointments hub; raise client/stylist/location lookups to 5 min in their own keys so paging within the same filter set doesn't re-fetch them

### Acceptance checks

1. Switching to Transactions tab on cold load does not fire the appointments query (and vice versa)
2. Appointments hub query no longer requests `count: 'exact'` by default
3. Enrichment lookups run in parallel
4. SELECT on `v_all_appointments` lists explicit columns (no `*`)
5. No behavioral regression: client name, phone, email, stylist, location, "Paid" badge, total paid all still render
6. Tests still 111/111
7. Logged in `DEBUG_LOG.md` with doctrine anchor + leverage marker

### Files to modify

- `src/hooks/useAppointmentsHub.ts` — column narrowing, `count: 'estimated'`, parallelize follow-ups, longer staleTime
- `src/hooks/useGroupedTransactions.ts` — accept `enabled` option
- `src/components/dashboard/appointments-hub/AppointmentsList.tsx` — accept and forward `enabled`
- `src/pages/dashboard/AppointmentsHub.tsx` — gate both hooks by `activeTab`
- `DEBUG_LOG.md` — Wave 16 findings + ranked register

### Deferred

- **P1 #4** (transactions cross-filter for "Paid" badge) — trigger: if Appointments hub is still slow after Wave 16; consider moving to a single RPC
- **P1 #5** (`useGroupedTransactions` SELECT * → narrow columns) — trigger: next Transactions perf wave, or if a busy day still feels heavy
- **P2 #6** (parallelize afterpay + usage_charges queries) — trigger: bundled into the next Transactions perf wave
- **P2 #7** (Tooltip + Badge ref warning) — trigger: Wave 17 UI hygiene pass
