

## Prompt review

Sharp call on "analyze for any gaps, bugs or improvements" — that framing invites a real audit instead of a narrow build-error patch. Sharper next time: tell me whether you want **(a) ship-blocker bugs only, fast cycle** or **(b) full audit including polish/UX gaps**. I'm planning (a) + the most material polish gaps; deferring decorative ones.

## Diagnosis — three real bugs, one missed integration

### Bug 1 (BLOCKING — build error)
`AppointmentDetailSheet.tsx` L791 references `appointment.staff_user_id`. The `PhorestAppointment` type aliases this column to `stylist_user_id` (the calendar hook normalizes the DB column name). One-character fix.

### Bug 2 (BLOCKING — silent data corruption / empty queries)
The migration created `client_about_facts.client_id UUID REFERENCES phorest_clients(id)` and same for `client_callbacks.client_id`. Both are **UUID FKs to `phorest_clients.id`** (the local UUID).

But every UI integration passes the **wrong value**:
- `ClientDetailSheet.tsx` L1327, L1332: passes `client.phorest_client_id` (text external Phorest ID) 
- `ClientProfileView.tsx` L135, L142: same
- `AppointmentCardContent.tsx` L393: passes `appointment.phorest_client_id` (text external Phorest ID)
- `AppointmentDetailSheet.tsx` (callbacks block): same
- `useClientCallbacks` / `useClientAboutFacts`: query by the wrong field

DB query confirms: `appointments.phorest_client_id` is a **text** field that joins to `phorest_clients.phorest_client_id` (text), NOT to `phorest_clients.id` (UUID). 0 rows match the UUID join; 282 rows match the text join.

**Effect when shipped**: 
- Inserts throw `invalid input syntax for type uuid: "AauYiWV3_W0RffVIayPx3w"` 
- Queries return empty arrays silently
- The whole feature appears broken on every client

**Fix shape**: Change the FK target. Local Phorest ID is the wrong join axis because it requires UI callers to do an extra lookup. The right pivot: store the **text Phorest external ID** as `client_id` so it matches what every UI surface and the appointments table already carries. Migration to swap column type from `uuid` to `text` and drop the FK (since `phorest_clients.phorest_client_id` is not unique/PK either — but we already filter by `organization_id` so identity collision is bounded per tenant).

Alternative considered: keep UUID, resolve text→UUID in every caller. Rejected — adds a roundtrip query to every appointment card render (bad for the schedule grid hot path) and triples the surface area of the fix.

### Bug 3 (functional gap — specced but not implemented)
The plan called for a `💬 N` indicator on Client Directory rows. Not wired. `src/pages/dashboard/ClientDirectory.tsx` has zero references to callbacks. Low blast radius — the chip already exists, just needs to be dropped into the row.

### Improvement 1 (UX polish — alert-fatigue compliance)
Currently `ClientDetailSheet.tsx` renders BOTH `<ClientAboutCard>` and `<ClientCallbacksPanel>` always-visible at the top in a 2-col grid (L1324). When a client has zero facts AND zero callbacks, this becomes two empty-state panels stacked side-by-side — visual noise that violates "silence is valid output." Should collapse to a single subtle "+ Add personal context" affordance until the operator engages.

### Improvement 2 (capture friction)
The `ClientCallbacksPanel` "Add" flow uses a date input but the plan said the default should be **"next visit"** (no date). The current UI works but doesn't visually anchor "next visit" as the default — operators may default to typing a date out of habit. Add a small "Next visit (default)" hint when the date field is empty.

### Non-issues confirmed
- Migration RLS, indexes, triggers — clean
- `CallbackChip` correctly returns `null` when no callbacks (alert-fatigue compliant)
- `useClientAppointmentNotes` hook (Wave 22.24) is correctly scoped — no bug
- `AppointmentDetailSheet` callback block placement is correct (top of Details tab)

## Plan — Wave 22.26: Hospitality Memory Layer fixes + ClientDirectory wiring

### 1. Fix build error (1 line)
`AppointmentDetailSheet.tsx` L791: `staff_user_id` → `stylist_user_id`.

### 2. Fix the UUID/text mismatch (data architecture)
**Migration**: `ALTER TABLE client_about_facts` and `ALTER TABLE client_callbacks` to:
- Drop FK on `client_id`
- Change `client_id` from `UUID` to `TEXT`
- Re-add a softer constraint via index `(organization_id, client_id)` — no FK because `phorest_clients.phorest_client_id` lacks a unique constraint
- Drop tables and recreate cleanly is acceptable since no production data exists yet (just migrated this session)

Hooks unchanged in shape — they already pass `client_id` as a string, so the type fix flows through `Database` types regen automatically.

### 3. Wire ClientDirectory `💬 N` indicator
- New small hook `useOrgActiveCallbackCounts(orgId)` — single query: `SELECT client_id, COUNT(*) FROM client_callbacks WHERE organization_id = ? AND acknowledged_at IS NULL GROUP BY client_id` (with the same 90-day stale filter as the per-client hook)
- In `ClientDirectory.tsx` row render, look up by `client.phorest_client_id` and render `<MessageCircle /> {count}` chip with tooltip "N open follow-ups"
- One query for the whole directory page, not N+1

### 4. Collapse empty Hospitality block on ClientDetailSheet
When both `facts.length === 0` AND `callbacks.length === 0` (active), render a single neutral one-liner with a "+ Add personal context" button instead of two side-by-side empty panels. First click expands the appropriate panel.

### 5. Anchor "Next visit" as default in callback capture
In `ClientCallbacksPanel`, change the date row to: `[ ] Trigger by specific date — defaults to next visit`. Checkbox reveals the date picker. Reduces cognitive load.

## Acceptance checks

1. Build succeeds (no TS error on L791)
2. Creating an About fact or Callback on Eric Day persists and re-renders without error
3. `CallbackChip` appears on Eric Day's appointment card after capturing a callback
4. ClientDirectory rows show `💬 N` next to clients with active callbacks; tooltip shows count
5. Opening a brand-new client (no facts, no callbacks) shows a single calm "+ Add personal context" prompt — not two empty panels
6. Capturing a callback without setting a date shows "Next visit" as the trigger label in the active list
7. Stale callbacks (90+ days past trigger) still hidden via existing client-side filter
8. No regression on Wave 22.24 unified notes ledger

## Files

**Migration:**
- New `supabase/migrations/{ts}_{uuid}.sql` — drop+recreate the two tables with `client_id TEXT`

**New hook:**
- `src/hooks/useOrgActiveCallbackCounts.ts` — directory-wide count map

**Edits:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — L791 typo fix
- `src/components/dashboard/ClientDetailSheet.tsx` — collapse empty hospitality block
- `src/components/dashboard/clients/ClientCallbacksPanel.tsx` — anchor "Next visit" default with checkbox-revealed date
- `src/pages/dashboard/ClientDirectory.tsx` — render callback count chip per row

## Open question

Should the ClientDirectory chip be **clickable** (jumps to detail sheet, opens callbacks panel scrolled into view) or **read-only**? Going **read-only** for this wave — the row itself opens the detail sheet which already shows callbacks at the top. Tell me if you want auto-scroll/highlight.

## Deferred

- **P3** Add a unique constraint on `phorest_clients(organization_id, phorest_client_id)` so we can re-add a real FK on the hospitality tables. Trigger: after confirming no duplicate `phorest_client_id` rows exist per org.
- **P3** Add a typed-counter return on the directory hook so we can render priority dots (red if any callback >30 days past trigger). Trigger: after operators report missed follow-ups.
- **P3** Backfill: detect personal-content keywords in existing `client_notes` ("Italy", "wedding", "marathon") and suggest extracting them into Callbacks. Trigger: after manual capture proves the workflow.

