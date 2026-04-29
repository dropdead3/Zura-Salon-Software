## Goal

Two upgrades to the **Clients with this stylist as preferred** bucket inside the Archive Wizard:

1. **Tooltip** next to "Drop all" (and the other bulk action buttons) explaining what the action does.
2. **Per-client reassignment** — replace the bulk-only treatment of this bucket with a per-client list. Each row shows the client's history with the archived stylist, surfaces a recommended successor at the same level with capacity, and lets the operator pick a different stylist if they want.

The same per-row tooltip pattern (Drop / Cancel / End-date) is applied to all bucket types, so the operator never has to guess what each verb means.

## What changes

### 1. Backend — `scan-team-member-dependencies` returns client items

The bucket is currently bulk-only because `items: []`. Update the function to:

- Pull up to 200 clients where `preferred_stylist_id = targetUserId`, selecting:
  - `id, first_name, last_name, last_visit_date, visit_count, total_spend, average_spend, location_id`
- For each client, also pull a small **recent appointment summary** (last 12 months with this stylist):
  - top 3 service names by frequency
  - average ticket
  - last visit date with this stylist
- Run a single grouped query (`appointments` filtered by `staff_user_id = targetUserId AND client_id IN (...)`) and aggregate in-memory to keep this O(1) round trips.
- Pull eligible roster **with stylist_level** and current upcoming-week capacity (count of appointments per stylist next 14 days) so the resolver can pick a successor.
- Compute `recommendedSuccessorUserId` per client:
  - same `stylist_level` as archived stylist (if known)
  - same `location_id` as the client (when set)
  - lowest forward-load (capacity proxy)
  - tie-breaker: earliest `hire_date`
- Return enriched `items[]` shaped as:
  ```ts
  {
    id: string;            // client id
    first_name, last_name,
    last_visit_date, visit_count,
    avg_ticket: number,
    top_services: string[],
    location_id: string | null,
    recommended_user_id: string | null,
    recommendation_reason: string,   // e.g. "Same level · Eastside · 12 open slots"
  }
  ```
- Keep `count` as the **true total** (can exceed `items.length`).
- Add a top-level `stylistLevelOfArchived: string | null` so the UI can label the level for matching.

No schema changes. Pure read-side enrichment of one already-existing edge function.

### 2. Frontend — `BucketWorkspace` recognises `client_preferences` as per-item

Currently the wizard treats `client_preferences` as bulk-only (`isBulkBucket = b.key === 'client_preferences' || b.items.length === 0`). Now that the scan returns items for it, just remove the `client_preferences` special-case so the per-item list renders. The bulk row stays at the top (operators still want one-click "send all 11 clients to Maya").

### 3. New `ClientPreferenceRow` sub-component

Rendered for each client item in the `client_preferences` bucket. Shows:

- **Left column (history)**:
  - Client name (font-sans text-sm)
  - One-line summary: `12 visits · last Mar 14 · avg $185`
  - Top services chips (up to 3): `Color · Cut · Gloss`
- **Middle column (recommendation)**:
  - Inline "Recommended" pill + suggested teammate name
  - Sub-line: `recommendation_reason` (e.g. *"Same level · Eastside · 12 open slots"*)
  - "Use" button to one-click accept (sets pick to recommended user)
- **Right column (override)**:
  - Pill-shaped Select (eligible stylists at any level, with their level annotated as a suffix in the option label) for manual override
  - "Drop" button (with tooltip)

Decision state mirrors existing `picks[bucket][clientId]` shape — `action: 'reassign' | 'drop'`, `destinationUserId: string | null`. No new schema.

### 4. Tooltips on all action verbs

Wrap each bulk-action and per-row action button in a `Tooltip` (already shipped at `@/components/ui/tooltip.tsx`):

- **Reassign** → "Move all open work to the selected teammate. They become responsible going forward."
- **Drop** → "Remove the link to this archived stylist without notifying or reassigning. For client preferences this clears the 'preferred stylist' field — clients can re-pick on their next booking."
- **Drop all** → same wording, scoped to "all items in this bucket".
- **Cancel** → "Cancel the underlying record (appointment, request, swap). The client / counterpart will be notified per your existing cancellation policy."
- **Cancel all** → same, scoped.
- **End-date all** (recurring schedules) → "Set the end date to the archive's effective day so this recurrence stops generating new shifts."

The tooltips live in a single `BUCKET_ACTION_TOOLTIPS` map at the top of `ArchiveWizard.tsx` so wording stays consistent and editable in one place. A small `<TooltipHint>` helper renders the trigger as the existing button text plus a subtle `Info` icon (uses `lucide-react` `Info`, already in the bundle).

`TooltipProvider` is mounted at the wizard root so all tooltips share one provider.

### 5. Visual / token compliance

- Pill Select for the override picker (`rounded-full`) per Input Shape Canon.
- `font-display text-[10px] uppercase tracking-wider` for the "Recommended" pill; `font-sans text-xs` for client history line; `font-sans text-[11px] text-muted-foreground` for service chips.
- Money values stay raw integers/strings here (operator-facing wizard copy), but the **avg ticket** badge wraps in `<BlurredAmount>` per the project Privacy core rule.
- Service chips: small outline `Badge` with `text-[10px]`.
- Recommended pill: `border-emerald-500/40 text-emerald-500` to match the Handled state language already established on Step 2.
- Drop button gets a destructive-tinted ghost variant only when hovered, matching the existing Cancel-all treatment.

## Files Edited

- `supabase/functions/scan-team-member-dependencies/index.ts` — enrich client_preferences bucket with items + recommendations; add eligible-roster query; expose `stylistLevelOfArchived`.
- `src/hooks/useArchiveTeamMember.ts` — extend `DependencyBucket` items shape (loose `Record<string, unknown>` already, so no breaking change) and add the `stylistLevelOfArchived` field to `DependencyScan`.
- `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`:
  - Drop the `client_preferences` special-case in `isBulkBucket`.
  - Add `BUCKET_ACTION_TOOLTIPS` map + `TooltipHint` wrapper.
  - Wrap every bulk + per-row action button with the tooltip.
  - Mount `TooltipProvider` at the wizard root.
  - Add `ClientPreferenceRow` sub-component and route to it from inside `BucketWorkspace` when `bucket.key === 'client_preferences'`.

## Out of scope

- No new tables, no migrations.
- No notification emails to clients about the change of preferred stylist (proposed as enhancement #2 below).
- No multi-select bulk-to-multiple-stylists splitter UI (proposed as enhancement #3 below).

## Enhancement Suggestions (optional, not in this plan)

1. **"Why this stylist" expand** — clicking the Recommended pill expands a tiny diff card: archived stylist's average ticket vs recommended's, distance from the client's preferred location, retention rate. Lets the operator see the math.
2. **Soft-notify clients** — when reassignment is committed, queue a one-time notification *"You've been moved to {new stylist}. Need someone else? Re-pick anytime."* (opt-in toggle in Step 4).
3. **Smart split bulk** — instead of "send all 11 to Maya", offer "Distribute evenly across {Maya, Jordan, Kai} based on capacity & level." One click, balanced load.
4. **Client-level guardrail** — if a client has a future appointment already booked with the archived stylist, link the two decisions: reassigning the appointment auto-fills this row's recommendation.

## Prompt Coaching

This was a sharp prompt — you stacked three concrete asks (tooltip, per-stylist assignment, intelligence-driven recommendation) and gave the criteria for the recommendation (capacity + same pricing level). Two refinements to compound future asks:

- **State the recommendation tie-breaker.** "Same level + has capacity" can pick 5 candidates. Adding "prefer same location, then earliest hire date" lets me commit to a single pick instead of asking back.
- **Name the override behavior.** "Recommend a stylist, but the operator can override" tells me to render the pick as a soft default, not a hard decision. I'm assuming this — flag if you want the recommendation auto-applied unless the operator changes it (saves clicks for the typical case).
