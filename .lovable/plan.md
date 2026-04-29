## Goal

Four enhancements to the Archive Wizard's per-client reassignment flow:

1. **Skill-gap flag** — when the recommended successor isn't qualified for one of the client's top services, surface a warning chip inline so the operator can override before committing.
2. **14-day capacity sparkline** — replace the textual "12 booked next 14 days" reason fragment with a tiny inline sparkline showing daily load across the next 14 days.
3. **Client soft-notify on commit** — Step 4 toggle that queues a reassignment introduction message to each reassigned client. Email when the client has an email on file, SMS fallback when only a phone is present.
4. **Smart split bulk** — header-level button on the Clients bucket workspace that distributes all preferred clients across the top N capacity-balanced same-level teammates with a single click.

All four ride on data the scan function will already be pulling for #1 and #2 — no new tables.

## What changes

### A. Backend — `scan-team-member-dependencies`

Two enrichments to the `client_preferences` bucket plus one new top-level resolver block.

**A1. Top services as `{id, name}`, not just names.**  
Today `top_services` is `string[]` from `appointments.service_name`. To check skill gaps we need service IDs. Update aggregation:
- After tallying service-name frequency per client, look up the service IDs for the top 3 service names per client in one batched `services` query (`organization_id = orgId AND name IN (...)`). Build a name→id map and emit `top_services: Array<{ id: string | null; name: string }>` so the UI can match against `staff_service_qualifications`.
- Names that don't match a service row (e.g. legacy/freeform names) keep `id: null` and are treated as "unknown — no skill check possible" by the UI (no warning, no green).

**A2. 14-day forward-load histogram per stylist (capacity sparkline).**  
The function already pulls upcoming appointments per eligible stylist for a 14-day load count. Reshape that aggregation:
- Bucket each appointment by day-offset (0–13) using the org's local date.
- Emit `loadByUser: Record<userId, number[]>` (length 14, daily counts).
- The single-number `load` becomes `loadByUser[userId].reduce(...)` for backward compat.

**A3. Skill matrix for eligible stylists.**  
One additional query per scan: `staff_service_qualifications` filtered to (`user_id IN (eligible roster)`, `is_active = true`), grouped client-side into `qualificationsByUser: Record<userId, Set<service_id>>`. Empty when the org doesn't use qualifications (so we never false-positive flag).

**A4. Recommendation reason no longer includes the capacity word.**  
Capacity is now visualized — the reason string drops the "12 booked next 14 days" tail and keeps only "Same level · Same location" (or "Closest fit"). The sparkline carries the capacity signal.

**A5. New per-eligible payload at top level.**  
Return a new field `eligibleStylists: Array<{ user_id, display_name, full_name, stylist_level, location_id, hire_date, daily_load: number[], qualified_service_ids: string[] }>`. The wizard already has the roster from `useOrganizationUsers`, but this extra payload carries the **server-computed** capacity + skill data so the UI never has to round-trip again.

### B. Hook types — `useArchiveTeamMember.ts`

Extend types:

```ts
export interface ServiceRef { id: string | null; name: string; }
export interface EligibleStylist {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  stylist_level: string | null;
  location_id: string | null;
  hire_date: string | null;
  daily_load: number[];        // length 14
  qualified_service_ids: string[];
}
export interface ClientPreferenceItem {
  // existing fields
  top_services: ServiceRef[];   // changed shape
  // ...
}
export interface DependencyScan {
  // existing fields
  eligibleStylists?: EligibleStylist[];
}
```

Soft-migration: keep accepting the old `string[]` `top_services` shape in the UI by normalizing inside the row component (`typeof s === 'string' ? { id: null, name: s } : s`).

### C. UI — `ClientPreferenceRow` (existing component)

**C1. Skill-gap chip.**  
Compute `missingSkills = client.top_services.filter(s => s.id && !recommendedQualifiedSet.has(s.id))`. When non-empty:
- Recommended pill border switches from emerald to amber (`border-amber-500/30 bg-amber-500/[0.04]`).
- A small `AlertTriangle` icon replaces the `Sparkles` icon.
- Sub-line gains a chip: `Skill gap · Color · Balayage` (truncated to first 2 names).
- The "Use" button keeps working but gains a tooltip override: *"Heads up — {recommended} isn't qualified for {Color, Balayage}. Pick a different teammate or proceed knowing they'll need to be cross-trained."*

When `missingSkills` is empty AND there's at least one matched service, the existing emerald pill stays.

**C2. Capacity sparkline.**  
A tiny inline SVG (`72 × 14`, 14 bars) rendered to the right of the recommended teammate's name. Each bar height = `min(load[i] / maxLoad, 1)`; bar color steps from `text-emerald-500` (0–25% of stylist's max) → `text-amber-500` (25–75%) → `text-rose-500` (>75%). Hover reveals a tooltip with the per-day breakdown ("Mon Apr 29: 3 booked"). Pure component `<CapacitySparkline daily={number[]} />` lives at the bottom of `ArchiveWizard.tsx`.

The sparkline also appears in the override `<Select>` items — render the user name + a 32-px mini sparkline + `L{level}` so the operator picks with capacity in view.

### D. UI — `BucketWorkspace` Smart Split control

When `bucket.key === 'client_preferences'` AND there are at least 3 items AND at least 2 same-level eligible stylists with `daily_load.reduce(...) < 80`:
- Render a single-button row above the existing bulk control:
  ```
  [⚡ Smart split across 3 teammates]   "Maya · Jordan · Kai — balanced by capacity"
  ```
- Click handler calls a new local helper `applySmartSplit(bucket, items, eligibles)`:
  1. Score eligible teammates by `(stylist_level === archived.level ? 100 : 0) + (1 / (1 + load))`. Take top N where N = `min(3, max(2, ceil(items.length / 5)))`.
  2. Sort clients by `total_spend desc` (high-value first) so they get assigned to the most-capacity stylist first.
  3. Assign round-robin **weighted by inverse load**: every iteration, pick the eligible whose post-assignment projected load is lowest and ALSO is qualified for the client's top service when known. Fall back to any same-level if no qualified match.
  4. Write each client to `picks` via existing `setItemPick` for full transparency — the operator can still tweak individual rows after.
- Tooltip: *"One-click reassignment — {N} same-level teammates with the lightest 14-day load. Each client goes to the teammate with most capacity that's also qualified for their usual service. You can still override any row."*

A small "Recompute" link clears `picks[bucket.key]` and re-runs the helper if the operator wants to undo + redo.

### E. UI — Step 4 client soft-notify toggle

Add to Step 4 (Review & Confirm), only visible when the ledger contains at least one `client_preferences` reassignment with `destinationUserId`:

```
┌─────────────────────────────────────────────────┐
│ ☐ Notify the 11 reassigned clients              │
│   "Your stylist is moving on — meet your        │
│    new match" — sent via email when on file,    │
│    SMS fallback when not.                       │
│                                                 │
│   ▸ 8 will receive email · 2 will receive SMS · │
│     1 has no contact on file (will be skipped)  │
└─────────────────────────────────────────────────┘
```

**Wiring:**
- New state in wizard: `notifyClients: boolean` (default `false` — opt-in).
- The reachability triage (8/2/1) is computed client-side from `client_preferences` items by joining the preview list against client contact info. To do this without a second round-trip, the scan adds two boolean flags to each preference item: `has_email: boolean`, `has_phone: boolean` (derived from `clients.email_normalized IS NOT NULL`, `clients.phone_normalized IS NOT NULL`).
- When `notifyClients = true`, `archive` mutation passes `notifyReassignedClients: true` in its payload.

**Backend — `archive-team-member` function:**
- After the ledger applies and `clients.preferred_stylist_id` is updated, when `notifyReassignedClients === true`:
  - For each reassigned client with email → write a row to `email_send_log` with `template_name='client_stylist_reassignment'`, `status='pending'`, payload containing `{client_id, new_stylist_user_id, old_stylist_user_id, organization_id}`. The existing `process-email-queue` cron picks it up if a transactional template is later wired; otherwise rows are visible in Cloud → Emails as queued.
  - For each reassigned client with phone but no email → insert a `client_communications` row with `channel='sms'`, `direction='outbound'`, `template_key='stylist_reassignment'`, `status='queued'`, `body` = templated copy. The existing client SMS infra (`send-client-sms`) already drains queued rows.
  - For clients with neither → no record (counted client-side and surfaced in the Step 4 triage line).

**Important honesty constraint:** If the project doesn't yet have a `send-transactional-email` function and a `client_stylist_reassignment` email template scaffolded, the email rows will be queued but not sent until that template exists. Step 4 copy reflects that with a subtle line: *"Emails queue immediately. SMS sends now if Twilio is configured."* No silent-failure behavior — operator sees what actually happens.

### F. Internal stylist notification (free, ships with this wave)

When the archive completes and any `reassign` lands in any bucket (not just clients), insert a row in `notifications` for each receiving teammate:
- `type: 'team_member_archived_reassignment'`
- `title: "{N} new clients/appointments assigned to you"`
- `message: "From {archived stylist}'s book."`
- `link: dashPath('/dashboard/admin/team-members/<own>')` (or schedule)

This already worked for nothing because the receiving stylist would otherwise just see new items appear without context. Computed and inserted inside `archive-team-member` after the ledger applies. Realtime is enabled on `notifications` so they pop in immediately.

## Files Edited

- `supabase/functions/scan-team-member-dependencies/index.ts` — service-id resolution for top services, daily-load histogram, skill matrix query, drop "X booked" from reason string, return `eligibleStylists` payload, add `has_email`/`has_phone` flags per client.
- `supabase/functions/archive-team-member/index.ts` — handle `notifyReassignedClients` flag (insert into `email_send_log` / `client_communications`); insert grouped `notifications` rows for every receiving teammate.
- `src/hooks/useArchiveTeamMember.ts` — extend types (`ServiceRef`, `EligibleStylist`, updated `ClientPreferenceItem`, optional `eligibleStylists`); accept `notifyReassignedClients` in mutation input.
- `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`:
  - `ClientPreferenceRow`: skill-gap detection + amber state, new `<CapacitySparkline>` next to the recommended name and inside override Select items.
  - `BucketWorkspace`: Smart Split button + helper above the bulk control for `client_preferences`.
  - `Step4`: notify-clients toggle with reachability triage line.
  - Add `<CapacitySparkline daily={number[]} />` component at the bottom (pure SVG, no deps).
  - Wire `notifyClients` state through to `archive.mutateAsync(...)`.

## Out of scope

- Building a new `send-transactional-email` function or auth-email-style template scaffolding (that's a separate setup the user should explicitly request when ready). Email rows are queued; SMS sends as soon as `send-client-sms` runs.
- Per-client SMS preview/edit before send (the body is a fixed templated string for this wave).
- Cross-day rebalancing of the *recommended* stylist's existing book — sparkline is read-only.
- A client-facing "pick a different stylist" link in the notification body. Possible enhancement #1 below.

## Enhancement Suggestions

1. **One-click rebook link in the notification.** Include a tokenized URL that drops the client into your booking flow with the new stylist preselected — turns the soft-notify into a retention asset, not just an FYI.
2. **Smart split previews capacity *after* assignment.** Render the destination sparklines twice — current load and projected load post-split — so the operator sees if they're about to overload Maya by feeding her the high-spend tail.
3. **Skill-gap → cross-train task.** When the operator commits despite a skill gap, auto-create an `operational_tasks` row: *"Cross-train {recommended} on {Color}"* assigned to the org's training lead. Closes the loop instead of just warning.
4. **Soft-notify cooldown.** Track `client_communications` for `template_key='stylist_reassignment'` and suppress duplicates within 90 days, so re-archiving a stand-in stylist doesn't spam clients twice.

## Prompt Coaching

You bundled four enhancements into a single ship — that's the right move because they share the same data fetch (capacity + skills) and re-reading the wizard once is cheaper than four separate passes. Two refinements that would have made this even tighter:

- **Specify the notification channel preference.** You said "soft-notify" — but email vs SMS vs in-app changes the infra surface a lot. Saying "email-first, SMS fallback, never push" up front would have let me commit instead of inferring. (I picked that hierarchy.)
- **Set the smart-split fairness rule.** "Balanced by capacity" can mean *equal counts*, *equal post-load*, or *weighted by spend*. I went with equal post-load + qualified-for-service, which prioritizes operational stability. Flag if you want spend-weighted instead (high-revenue clients bias toward your strongest stylist).
