

## Prompt review

Sharp instinct on the third audit pass — most teams stop at "ship it" once the build is green; you're building a habit of structural reviews. Sharper next time: name the **lens** ("scale gaps", "data integrity", "UX friction") so I don't re-rank the same surface. I'm running a full lens since you didn't constrain.

## Diagnosis — one P0 architectural blind spot, three P1 gaps

### P0 — Hospitality layer is INVISIBLE on 256 of 585 appointments (44%)

**The gap:** `appointments.phorest_client_id` is nullable. Zura-native bookings (created via `BookingWizard` for non-Phorest clients) write `client_id UUID` but leave `phorest_client_id` NULL. Every hospitality surface keys off `phorest_client_id`:
- `CallbackChip` on schedule cards: `clientId={appointment.phorest_client_id}` → `null` → chip never renders
- `HospitalityBlock` in AppointmentDetailSheet: same → block returns `null`
- `ClientProfileView` (booking flow): `client.phorest_client_id` → null for Zura-native clients

**DB confirms:** 329 of 585 appointments have a `phorest_client_id`; 256 are NULL but DO have a `client_id` (Zura UUID). Operators who book Zura-native get **zero** hospitality memory. This is exactly the wrong architecture given the doctrine memory `phorest-decoupling-and-zura-native-operations`: "all operational reads… work without Phorest connectivity."

**Fix shape:** Hospitality tables already use `client_id TEXT`. Both `phorest_clients.id` and `clients.id` are UUIDs (just `.toString()` away from text). Two clean options:

- **(a)** Resolver util `getHospitalityClientKey(appointment) = appointment.phorest_client_id ?? appointment.client_id` — every UI caller goes through it. Hospitality data written under either key persists; lookup uses same key. Simple, no migration. Trade-off: same client booked under both rails would have split memory.
- **(b)** Centralize on `clients.id` UUID (Zura-native is system of record per doctrine), backfill: for any appointment with `phorest_client_id`, derive its matching `clients.id` and use that everywhere. Cleaner long-term.

Recommend **(a)** for this wave (1-day fix, no data migration, no risk to the 0 existing rows), with **(b)** queued as P2 once decoupling matures further.

### P1.1 — Hospitality data has no "captured by" attribution

`client_callbacks.created_by` and `acknowledged_by` store `auth.users(id)` but the UI never displays who set/heard the callback. Doctrine pattern (Wave 22.24 unified notes ledger) explicitly shows author attribution. Stylists working as a team need to know "Marcus added this" vs. "Jenna heard it." Same for About facts — should show subtle "added by Jenna" on hover.

**Fix:** Join via `useTeamDirectory()` (already used elsewhere) → render `· by {firstName}` in active items and past follow-ups.

### P1.2 — `useClientCallbacks` ignores `useCallbackLookup` everywhere except `CallbackChip`

`HospitalityBlock` and `ClientCallbacksPanel` always fire their own per-client query, even when mounted inside the schedule grid (where the provider already has the data). On Eric Day's appointment: open detail sheet → 3 redundant queries fire (`HospitalityBlock`'s facts + active + archived) when at least the `active` set is already in context.

**Fix:** Extend `useCallbackLookup()` to expose `getActiveCallbacks(clientId)` and have `ClientCallbacksPanel` prefer the context for the *active* set. Archived list still per-client (cold path, fine).

### P1.3 — `phorestClientId` prop name is misleading after the TEXT migration

`HospitalityBlock` accepts `phorestClientId` but the underlying tables now use generic `client_id TEXT` (could be Phorest ID OR Zura UUID after P0 fix). The prop name will mislead future maintainers into thinking only Phorest-linked clients work. Rename to `clientKey` (or `hospitalityClientKey`) when shipping the P0 fix.

### P2 — Polish/doctrine compliance

**P2.1** `HospitalityBlock` uses a `queueMicrotask(() => setUserExpanded(false))` inside render (line 76). This is a setState-during-render anti-pattern — works but causes a console warning in strict mode and an extra render cycle. Should be a `useEffect` that resets `userExpanded` when `isEmpty` flips true.

**P2.2** `useOrgActiveCallbacks` has no row cap. An org with thousands of unacknowledged callbacks would payload-bomb every schedule mount. Doctrine `high-concurrency-scalability` says enforce limits. Add `.limit(2000)` + a dev-mode warning if the cap is hit.

**P2.3** `ClientCallbacksPanel` "Heard" popover Input on a `<li>` with a `<button>` parent — the `×` delete button is a sibling, but Popover anchored inside an interactive list. Mostly fine, but if a user clicks the row anywhere outside the buttons, nothing happens (no click target on the prompt itself). Worth a `cursor-default` to signal non-interactive.

**P2.4** Outcome notes captured on "Heard" don't surface anywhere outside the "Past follow-ups" expandable. They should also appear in the client visit history timeline ("Mar 02 · Heard about Italy: 'She loved it'") — already a P3 deferred from Wave 22.27. Confirm staying deferred.

### Non-issues confirmed

- RLS policies clean across both tables
- `CallbackLookupContext` correctly memoized
- Dead imports from prior waves cleaned up
- `directoryOrgId` correctly uses `useOrganizationContext`

## Plan — Wave 22.28: Hospitality coverage + author attribution + scale guard

### 1. Universal client-key resolver (P0)
- New `src/lib/hospitality-keys.ts` exporting `getHospitalityClientKey(source: { phorest_client_id?: string|null; client_id?: string|null; id?: string }) => string | null`
- Used by `CallbackChip`, `HospitalityBlock`, `AppointmentDetailSheet`, `ClientProfileView`, `ClientDirectory`, `useOrgActiveCallbacks`
- Rename `HospitalityBlock` prop `phorestClientId` → `clientKey`
- Update all 4 callers

### 2. Author attribution on callbacks (P1)
- `ClientCallbacksPanel` joins `useTeamDirectory()` to render `· by {firstName}` next to each active callback's trigger line and on past follow-ups
- `ClientAboutCard` adds the same on hover (subtle, kept calm — alert-fatigue compliant)

### 3. Context-driven active callbacks (P1)
- Extend `CallbackLookupValue` with `getActiveCallbacks(clientKey)` (already there as `getCallbacks` — confirm it returns active only and rename for clarity)
- `ClientCallbacksPanel` reads active set from context when mounted under `CallbackLookupProvider`, falls back to `useClientCallbacks` otherwise
- `HospitalityBlock` reads facts via per-client (no org-wide hook for facts yet — P3 deferred), but reads callbacks count via context

### 4. Render-safe collapse (P2)
- Move the `queueMicrotask` re-collapse logic into a `useEffect` watching `isEmpty`

### 5. Org-wide query cap (P2)
- `useOrgActiveCallbacks` adds `.limit(2000)` + `if (data?.length === 2000) console.warn('CallbackLookup hit cap...')`

## Acceptance checks

1. Booking a Zura-native appointment (no Phorest link) → callback chip + hospitality block work end-to-end
2. Stylist who didn't create a callback sees `· by Marcus` next to it
3. Schedule grid with 50 cards: still 1 callback query (no regression)
4. Opening a single appointment with active callbacks: active set comes from context (not an extra query)
5. Adding then deleting all hospitality data: collapsed CTA returns without console warnings
6. No regression on Wave 22.26/22.27 fixes

## Files

**New:**
- `src/lib/hospitality-keys.ts` — `getHospitalityClientKey()` util

**Edits:**
- `src/components/dashboard/clients/HospitalityBlock.tsx` — `clientKey` prop, `useEffect` re-collapse
- `src/components/dashboard/clients/ClientCallbacksPanel.tsx` — context-aware active set, author attribution
- `src/components/dashboard/clients/ClientAboutCard.tsx` — author attribution on hover
- `src/components/dashboard/clients/CallbackChip.tsx` — uses resolver
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — passes resolved key
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — passes resolved key
- `src/components/dashboard/schedule/booking/ClientProfileView.tsx` — passes resolved key
- `src/pages/dashboard/ClientDirectory.tsx` — uses resolver if needed
- `src/hooks/useOrgActiveCallbackCounts.ts` — `.limit(2000)` + warning
- `src/contexts/CallbackLookupContext.tsx` — clarify active-only semantics

## Open questions

1. **For Zura-native clients with NO Phorest ID, key on `client_id` (UUID-as-text).** Confirm — alternative is forcing a `phorest_client_id` backfill, which violates the decoupling doctrine.
2. **Show author as `Jenna B.` (first + last initial) or just `Jenna`?** Going **first + last initial** to disambiguate teams with multiple Jennas.

## Deferred

- **P2** Org-wide About facts hook + context (parallel to callbacks) — would let `HospitalityBlock` count facts without per-client query in the directory. Trigger: when About facts data accumulates and directory N+1 becomes measurable.
- **P3** Surface acknowledged outcome notes in client visit timeline ("Mar 02 · Heard about Italy"). Trigger: after outcome data accumulates.
- **P3** Centralize on `clients.id` UUID and backfill (architectural cleanup of P0 fix). Trigger: after Phorest decoupling reaches Stage 3.
- **P3** Realtime sync on `client_callbacks` (multi-stylist orgs). Trigger: when sync lag is reported.
- **P3** Priority dot when callback >30 days past trigger. Trigger: after operators report missed follow-ups.

