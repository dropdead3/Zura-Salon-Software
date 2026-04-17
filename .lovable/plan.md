

## Prompt review

Sharp instinct on running another audit pass — feature waves accumulate residue, and a third look usually catches what the prior two missed once integration is real. Sharper next time: name the **lens** ("look for security/RLS gaps" vs "look for UX friction" vs "look for data plumbing bugs") so I can rank findings by your actual concern. I'm running a full lens here and ranking findings P0/P1/P2.

## Diagnosis — findings ranked by impact

### P0 — Functional bugs

**1. `directoryOrgId` derived from first client row is fragile.** `ClientDirectory.tsx` L383: `const directoryOrgId = (clients?.[0] as any)?.organization_id ?? null;`. If `clients` is empty (new tenant, filter wipes all rows, slow load), the callback-counts query never enables. Worse: if a duplicate-merge surfaces a row from a different org first (cross-tenant exposure is RLS-blocked, but ordering is not guaranteed), the count map would be wrong. Should use `useOrganizationContext().selectedOrganization.id` directly — same source the row queries already use.

**2. `HospitalityBlock` collapsed-empty state silently disappears once the user expands then deletes everything.** When `expanded === true` and the user deletes their last fact + acknowledges their last callback, `isEmpty` becomes true again but `expanded` stays true → renders two empty panels (the exact noise we collapsed away). Need to reset `expanded` to false when `isEmpty` flips back to true, OR drop the local `expanded` state entirely and let the panels' own internal "Add" affordances handle expansion.

**3. `ClientDetailSheet` has dead imports.** L60–61 still import `ClientAboutCard` and `ClientCallbacksPanel` directly even though only `HospitalityBlock` is used. Not a runtime bug but a TS lint warning and confusing for future maintainers.

### P1 — UX gaps

**4. AppointmentDetailSheet does NOT use `HospitalityBlock` — it stacks `ClientCallbacksPanel` + `ClientAboutCard` raw (L1602–1618).** Same empty-state noise problem: opening any appointment for a client with no facts/callbacks shows two empty panels at the top of the Details tab. Should swap to `HospitalityBlock` for consistency with `ClientDetailSheet`.

**5. `ClientProfileView` (booking flow) also stacks raw — same fix needed (L132–146).** Three surfaces, three different empty-state behaviors today.

**6. CallbackChip on appointment cards triggers a query *per appointment card on screen*.** `useClientCallbacks(clientId)` fires once per card. On a busy schedule day (50+ cards), that's 50+ separate queries, each with their own RLS roundtrip. The org-wide hook `useOrgActiveCallbackCounts` already exists and could feed a `Map<clientId, ClientCallback[]>` (or count) to the chip via context — single query for the whole grid. This violates the high-concurrency-scalability doctrine.

**7. Callback "Heard" button has no outcome capture flow.** The DB schema has `outcome_note TEXT` and the plan called for "optional outcome note." UI just calls `ack.mutate({ id, client_id })` with no note — the field exists but is unreachable. Either wire a small inline textarea on click, or remove the column promise from the UI affordance. Recommend wire it: a tiny popover with an optional one-liner ("She loved it, going back next year") then Heard.

### P2 — Polish / doctrine compliance

**8. The 90-day stale filter runs client-side in BOTH `useClientCallbacks` and `useOrgActiveCallbackCounts` — duplicated logic, drift risk.** Should live in one place (a SQL view or a shared `isCallbackStale(cb)` util). Also: visibility-contracts doctrine says "audit queries must document their false-positive filter inline as a SQL comment" — the filter is in TS, so inline TS comments suffice but a `// FILTER: trigger_date < now() - 90d hidden as stale (alert-fatigue)` near both call sites would satisfy the doctrine.

**9. `useClientCallbacks` count chip on directory rows has no priority signal.** A callback set 89 days ago looks identical to one set yesterday. Doctrine says "rank impact" — a small color shift (amber → red border) when any callback is >30 days past trigger would surface "you're about to lose this hospitality moment." Already noted as deferred in Wave 22.26 — confirming it should stay deferred until operators ask, but flagging.

**10. No keyboard shortcut to capture a callback from the Schedule grid.** Stylists open a card, click Add, type, save — 4 actions. Could be 1: `K` while hovering a card opens a quick-capture popover. Defer until usage data shows.

### Non-issues confirmed

- Migration RLS policies — clean, all 4 ops covered with `is_org_member`
- `client_id TEXT` matches every UI caller (audited grep) — no UUID mismatch residue
- `CallbackChip` correctly returns null when empty — alert-fatigue compliant
- DB has 0 rows currently — feature is wired but unused; finding #6 only matters once data exists
- Build error from Wave 22.26 (`stylist_user_id`) confirmed fixed

## Plan — Wave 22.27: Hospitality residue cleanup + scale fix

### 1. Fix `directoryOrgId` derivation
`ClientDirectory.tsx`: replace `(clients?.[0] as any)?.organization_id` with `useOrganizationContext().selectedOrganization?.id`. Match the rest of the codebase.

### 2. Fix `HospitalityBlock` re-collapse
Drop local `expanded` state. Always render the two-panel grid when `!isEmpty`, render the collapsed CTA when `isEmpty`. The CTA's "Add personal context" button calls a new `onExpand` callback that opens `ClientCallbacksPanel` in adding-mode (or just renders the panels — the panels themselves have Add buttons). Simpler: when user clicks "Add personal context," force-render the panels (uncontrolled), and the next render with empty state collapses again only when both lists are empty AND no panel is mid-add. Use a derived `forceShow` flag from a ref that resets when both panels return to clean-empty state.

Cleanest: pass a `defaultAdding` prop into `ClientAboutCard` so the CTA opens directly into the add form. Skip the "expanded" middle state entirely.

### 3. Remove dead imports
`ClientDetailSheet.tsx` L60–61: drop `ClientAboutCard` and `ClientCallbacksPanel` imports.

### 4. Swap raw stacks for `HospitalityBlock`
- `AppointmentDetailSheet.tsx` L1602–1618 → replace with `<HospitalityBlock />`
- `ClientProfileView.tsx` L132–146 → replace with `<HospitalityBlock />` (compact variant — add a `compact` prop to HospitalityBlock that passes through to children)

### 5. Scale fix — single query for CallbackChip across the grid
- New `CallbackContext` (or extend an existing schedule-day context) that fetches `useOrgActiveCallbackCounts` once per Schedule mount and exposes a `getCallbacksFor(clientId): ClientCallback[]` lookup
- `CallbackChip` reads from context instead of firing its own query
- Falls back to `useClientCallbacks` when no context provider (preserves Client Detail sheet behavior)

Trade-off: org-wide query returns counts only today, not full prompt text. Need to extend `useOrgActiveCallbackCounts` to return `Map<clientId, ClientCallback[]>` (full rows, not just count) so the chip can show "Ask about Italy" not just "💬 1". Adds maybe 2KB of payload for an org with 50 active callbacks — worth it.

### 6. Wire outcome note on "Heard"
`ClientCallbacksPanel`: convert "Heard" button into a small popover with an optional one-line input + "Mark heard" submit. Empty input still acknowledges (no friction). Outcome note saved to existing `outcome_note` column.

### 7. Centralize stale filter
New `src/lib/callback-utils.ts` exporting `STALE_DAYS = 90` and `isCallbackStale(cb): boolean`. Both hooks import from it. One source of truth.

## Acceptance checks

1. ClientDirectory callback chip appears even when first client row is on a different org or empty
2. Adding then deleting all hospitality data on a client returns to the single-CTA collapsed state (no double-empty flash)
3. AppointmentDetailSheet and ClientProfileView use the same collapsed-empty pattern as ClientDetailSheet
4. Schedule grid with 50+ appointments fires 1 callback query, not 50
5. "Heard" flow optionally captures an outcome note; empty submit still works
6. Stale filter constant lives in one file; both hooks import it
7. No regression on Wave 22.26 fixes (typo, UUID/text mismatch)
8. No dead imports in `ClientDetailSheet.tsx`

## Files

**New:**
- `src/lib/callback-utils.ts` — `STALE_DAYS`, `isCallbackStale`
- `src/contexts/CallbackLookupContext.tsx` — provider + `useCallbackLookup()` hook for grid-wide single query

**Edits:**
- `src/pages/dashboard/ClientDirectory.tsx` — use `useOrganizationContext` for org id
- `src/components/dashboard/clients/HospitalityBlock.tsx` — drop `expanded` state, derive purely from data
- `src/components/dashboard/clients/ClientCallbacksPanel.tsx` — popover with optional outcome note on Heard
- `src/components/dashboard/clients/CallbackChip.tsx` — read from context first, fall back to per-client hook
- `src/components/dashboard/ClientDetailSheet.tsx` — drop dead imports
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — swap raw stack for `HospitalityBlock`
- `src/components/dashboard/schedule/booking/ClientProfileView.tsx` — same swap (compact variant)
- `src/hooks/useOrgActiveCallbackCounts.ts` — return full rows keyed by client_id, not just counts (rename to `useOrgActiveCallbacks`)
- `src/hooks/useClientCallbacks.ts` — import `STALE_DAYS`/`isCallbackStale` from shared util
- Wrap Schedule grid root in `<CallbackLookupProvider orgId={...}>`

## Open questions

1. **Outcome note: required or optional?** Going **optional** (empty submit still acknowledges) — required would add friction and operators would just type "ok" to dismiss.
2. **Should the org-wide hook still expose a count-only Map for non-grid callers?** Going yes — keep both `getCount(clientId)` and `getCallbacks(clientId)` on the context for ergonomic callers.

## Deferred

- **P2** Priority dot on directory chip (red border when any callback >30 days past trigger). Trigger: after operators report missed follow-ups.
- **P3** Keyboard quick-capture (`K` on hover). Trigger: after capture data shows operators want speed.
- **P3** Undo on accidental "Heard" tap (5-second toast with Undo). Trigger: if operators report mis-acks.
- **P3** Surface acknowledged outcome notes in client history timeline ("Mar 02 · Heard about Italy: 'She loved it'"). Trigger: after outcome notes accumulate.
- **P3** Realtime sync on `client_callbacks` (so a callback added on one device appears on another instantly). Trigger: when multi-stylist orgs report sync lag.

