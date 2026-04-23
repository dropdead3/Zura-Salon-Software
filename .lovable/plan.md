# Unify Native Zura Breaks & Blocks with Overlay Rendering

## Problem

When a stylist or admin creates a native Zura **Break** or **Block** via `AddTimeBlockForm`, it does NOT visually match Phorest-imported breaks. Today:

- Phorest sync writes to `staff_schedule_blocks` → renders via `BreakBlockOverlay` with the amber Coffee chip / muted Moon chip ("the look the user likes").
- Native Zura `create_break_request` RPC writes to `time_off_requests` AND inserts a row into `appointments` with `service_category = 'Break'` or `'Block'` → renders as a regular **appointment card** (the dark filled tile in the screenshot, no overlay treatment).
- Both also use the same generic Coffee icon — there is no visual differentiation between **Break** (rest period) and **Block** (admin/non-service time).

Result: native blocks look like appointments, not like the cleaner overlay chip Phorest produces.

## Goals

1. Native Zura breaks & blocks render through the **same `BreakBlockOverlay` pipeline** as Phorest blocks — pixel-identical look.
2. Visual differentiation:
   - **Break / Lunch** → Coffee icon, amber wash (unchanged).
   - **Block** → `CircleX` (or `Ban`) icon, muted slate wash — communicates "blocked / unavailable" rather than "resting".
3. No double-rendering. A native block must not show as both an appointment card AND an overlay chip.
4. The settings preview (`CalendarColorPreview`) reflects the new Block icon.

## Approach

### 1. Native blocks write to `staff_schedule_blocks` (new path)

Update the `create_break_request` RPC (new migration) so that when the request is auto-approved AND not full-day, it inserts into **`staff_schedule_blocks`** instead of `appointments`. This is the canonical break/block table (already used by Phorest, already overlay-rendered, already RLS-scoped, already realtime-friendly via the existing `useStaffScheduleBlocks` hook).

Mapping:
- `block_type` ← lowercased `p_block_mode` (`'break'` or `'block'`) — matches the keys already in `BLOCK_TYPE_CONFIG`.
- `label` ← `INITCAP(p_reason)` (e.g. "Lunch", "Admin Tasks").
- `source` ← `'zura'` (new, distinguishes from `'phorest'`).
- `user_id`, `location_id`, `block_date`, `start_time`, `end_time`, `organization_id` mapped directly.

Full-day blocks continue to live only in `time_off_requests` (no overlay needed — the entire day is hidden by existing capacity logic).

### 2. Stop creating appointment-row duplicates

Remove the `INSERT INTO appointments` branch from `create_break_request`. This eliminates the "looks like an appointment card" rendering entirely.

Backfill / cleanup migration: delete any existing rows in `appointments` where `import_source = 'time_off'` AND `service_category IN ('Break','Block')` — these were the legacy duplicates. (Safe: source of truth is `time_off_requests`.)

### 3. Add `CircleX` icon for Blocks

Update `BLOCK_TYPE_CONFIG` in `src/components/dashboard/schedule/BreakBlockOverlay.tsx`:
- `block` → icon `CircleX` (lucide), keep muted slate wash.
- `blocked` → same as `block` (alias).
- `off` → keep Moon (full-day, different semantic).
- `break` / `lunch` → unchanged Coffee + amber.
- `meeting` → keep Coffee + primary tint, OR swap to `Users` icon for clarity (recommend `Users`).

### 4. Mirror in `CalendarColorPreview`

Update `BLOCK_CONFIG` in `src/components/dashboard/settings/CalendarColorPreview.tsx` to use the same `CircleX` for Block so the settings preview matches the live schedule.

### 5. `dock/useDockAppointments` filter

The `.not('service_category', 'in', '("Block","Break")')` filter becomes a no-op once appointments no longer carry those categories. Leave it in place as a defensive guard for any legacy rows that survived backfill — no change required.

## Files Changed

**Migrations (new):**
- `supabase/migrations/<timestamp>_native_breaks_to_overlay.sql` — replaces `create_break_request` RPC; backfills/deletes legacy appointment duplicates.

**Code:**
- `src/components/dashboard/schedule/BreakBlockOverlay.tsx` — `CircleX` for `block`/`blocked`, optional `Users` for `meeting`.
- `src/components/dashboard/settings/CalendarColorPreview.tsx` — mirror the icon change in the Block sample tile.

**No changes needed:**
- `useStaffScheduleBlocks.ts` — already returns the right shape.
- `DayView.tsx` / `WeekView.tsx` — already render via `BreakBlockOverlay`.
- `AddTimeBlockForm.tsx` — calls the RPC; behavior is identical from the form's perspective.

## Edge Cases & Guardrails

- **Pending approvals**: If the org requires approval (`time_off_requires_approval = true`), no overlay row is inserted (status = `pending`). Once an admin approves, we'll need a follow-up trigger or a small extension to `respond_to_time_off_request` to materialize the overlay row. Plan note: include this trigger in the same migration so approve-flow stays consistent.
- **Tenant isolation**: New rows carry `organization_id` from the RPC param; `staff_schedule_blocks` already has org-scoped RLS — no policy changes needed.
- **Realtime**: `useStaffScheduleBlocks` uses 30s `staleTime` and already invalidates on the existing query keys; manually invalidate `['staff-schedule-blocks']` from `useCreateBreakRequest` so the new block appears immediately without waiting for poll.
- **Phorest write-back safety**: Native blocks have `source = 'zura'` and no `phorest_id`; the existing Phorest-write kill switch (`PHOREST_WRITES_GLOBALLY_DISABLED`) is unaffected.

## Out of Scope

- No change to full-day time-off rendering (still handled by capacity/agenda layer).
- No change to `time_off_requests` schema or approval UI.
- No new permissions or roles.

---

## Prompt Coaching

Strong points in your prompt:
- You correctly identified the visual target ("the way Phorest ones look") and gave a clear icon directive ("circle X for blocked").
- You used the right vocabulary (native vs. synced).

Sharper next time:
- Mention whether you want **block_type taxonomy expanded** (e.g. add `meeting`, `training` as first-class types with their own icons) or just visual parity. That decision affects the migration scope.
- Specify behavior for the **approval flow** (does a pending block show on the calendar at all?). Stating this upfront prevents a follow-up ticket.
