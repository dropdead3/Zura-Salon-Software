# Plan — Wave 0 (final TS fixes) + Waves 1–4 (Phorest-style Services)

## Context confirmed by inspection

- **process-client-automations**: line 46 already destructures `{ organizationId, dryRun }` from a Zod schema that uses `.optional()` (without defaults) on these fields → both end up `string | undefined` / `boolean | undefined`. Line 49 also re-reads `body.organizationId || body.organization_id`, which is `string | undefined`.
- **process-service-email-queue**: `stepMap = new Map(steps?.map(...) || [])` — TS infers value type as `{}`, so `step.subject` / `step.html_body` (lines 135–136) error.
- **revenue-forecasting**: schema uses `.optional().default(7)`, but `body` typing remains `number | undefined` because Zod's inferred type from `.optional().default()` is still `number | undefined` after destructure in some cases — needs nullish-coalesce at use sites (179, 342, 345). Cleaner: read `forecastDays` once with `?? 7`.
- **send-push-notification**: `Uint8Array` produced from `crypto.getRandomValues` and `base64UrlToUint8Array` widens to `Uint8Array<ArrayBufferLike>`; Deno's strict `BufferSource` requires `ArrayBuffer` (not `SharedArrayBuffer`). Fix is `as BufferSource` at the 5 call sites.
- **supply-intelligence**: `productMap = new Map((products ?? []).map((p: any) => [p.id, p]))` — value inferred as `{}`. Need `new Map<string, any>(...)`.
- **AppointmentDetailSheet services derivation** (line 1029): currently produces `{ name, duration, category, price }` per service from `serviceLookup`. No per-service start time, no per-service stylist override merged in. The drawer is wired to `useUpdateAppointmentServices` (writes via `update-phorest-appointment` edge function, demo-mode short-circuits to sessionStorage) and `useServiceAssignments` (per-service stylist overrides via `appointment_service_assignments`).
- **`appointment_service_assignments` table**: has `service_name + assigned_user_id + assigned_staff_name`. **Does NOT have** `start_time_offset_minutes`, `duration_minutes_override`, or `price_override`. Per-service time/duration/price editing requires a schema migration (Wave 3a).

## Wave 0 — final TS error fixes (5 files, ~16 errors)

### 1. `supabase/functions/process-client-automations/index.ts`
- Line 46: replace destructure with defaults: `const organizationId = body.organizationId ?? body.organization_id; const dryRun = body.dryRun ?? false;`
- Line 49: `await requireOrgAdmin(supabaseAdmin, user.id, organizationId!)` (with prior `if (!organizationId) return ...` guard).
- Line 71: pass `dryRun` (now `boolean`).

### 2. `supabase/functions/process-service-email-queue/index.ts`
- Line 65: `const stepMap = new Map<string, any>(steps?.map((s: any) => [s.id, s]) || []);`

### 3. `supabase/functions/revenue-forecasting/index.ts`
- Line 50: replace `forecastDays` destructure with `const forecastDays: number = body.forecastDays ?? 7;` (top of try block, after `body` resolves).
- Lines 179, 342, 345 then type-clean automatically.

### 4. `supabase/functions/send-push-notification/index.ts`
- Line 52 (importKey ikm): `ikm as BufferSource`.
- Line 61 (`salt:`): `salt: salt as BufferSource`.
- Line 62 (`info:`): `info: info as BufferSource`.
- Line 150 (importKey cek): `cek as BufferSource`.
- Line 152 (`iv: nonce`): `iv: nonce as BufferSource`.

### 5. `supabase/functions/supply-intelligence/index.ts`
- Line 131: `const productMap = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));`

## Wave 1 — Drawer service-row data shape

In `AppointmentDetailSheet.tsx` `services` memo (line 1029):

```tsx
const services = useMemo(() => {
  if (!appointment?.service_name) return [];
  const apptStart = appointment.start_time; // "HH:MM:SS"
  let cursorMin = parseTimeToMinutes(apptStart);
  return appointment.service_name
    .split(',').map(s => s.trim()).filter(Boolean)
    .map(name => {
      const info = serviceLookup?.get(name);
      const override = assignmentMap.get(name);
      const duration = info?.duration_minutes || 0;
      const startMin = cursorMin;
      cursorMin += duration;
      return {
        name,
        duration,
        category: info?.category || null,
        price: info?.price ?? null,
        startTime: minutesToHHMM(startMin),
        endTime: minutesToHHMM(cursorMin),
        assignedStylist: override
          ? { userId: override.assigned_user_id, name: override.assigned_staff_name }
          : { userId: appointment.stylist_user_id, name: appointment.staff_name },
      };
    });
}, [appointment, serviceLookup, assignmentMap]);
```

This stays purely derived — no DB writes. Time chips are visual only in Wave 1 (read-only).

## Wave 2 — `<ServiceRow>` interactive UI

New component `src/components/dashboard/schedule/ServiceRow.tsx` rendered in place of the existing line-1759 row. Phorest-style chip layout:

```
[Time] [Duration] [Service name + RQ checkbox]                    [Stylist] [Price]    [⋯]
 9:00    1h         Haircut   ☐ RQ                                  Erin     $40
```

- **Time chip** → opens `<TimePicker>` popover (15-min increments, clamped to ±2h from appointment start).
- **Duration chip** → numeric input popover (5-min increments, 5–240 min).
- **Price chip** → numeric input popover (currency, 0–$2000).
- **Stylist chip** → `<StylistPicker>` reusing the existing team list (`teamMembers`).
- **RQ checkbox** → "Requires Consultation" toggle; persists to `appointment_service_assignments.requires_consultation`.
- **⋯ menu** → "Remove service".
- Below the last row: **+ Add service** ghost button (opens existing `EditServicesDialog` in add-only mode, or inline service picker — TBD; default: reuse dialog).

Tokens: `tokens.button.cardFooter` for "Add service", `tokens.body.muted` for chip labels, `font-display` only on titles (chips stay `font-sans`). All currency wrapped in `<BlurredAmount>`.

## Wave 3 — Mutation wiring (REQUIRES SCHEMA MIGRATION)

### Wave 3a — DB migration
Add per-service override columns to `appointment_service_assignments`:

```sql
ALTER TABLE public.appointment_service_assignments
  ADD COLUMN IF NOT EXISTS start_time_offset_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_minutes_override integer,
  ADD COLUMN IF NOT EXISTS price_override numeric(10,2),
  ADD COLUMN IF NOT EXISTS requires_consultation boolean NOT NULL DEFAULT false;
```

All nullable (override semantics: `NULL` = inherit from `phorest_services` lookup). Existing RLS policies cover the new columns — no policy change needed. Idempotent.

### Wave 3b — Hook extensions
- Extend `useServiceAssignments.ts` upsert payload to accept `startTimeOffsetMinutes`, `durationMinutesOverride`, `priceOverride`, `requiresConsultation`.
- Extend `useUpdateAppointmentServices.ts` `ServiceEntry` to carry the same four fields. **Edge function `update-phorest-appointment` is NOT modified** — per the Phorest Write-Back Safety Gate doctrine, all per-service overrides write to Zura's `appointment_service_assignments` only. The edge function continues to handle the canonical `service_name` string mutation.
- Demo-mode (`appointmentId.startsWith('demo-')`) persists overrides to sessionStorage under a parallel key.

### Wave 3c — Audit logging
Each chip mutation fires an audit event via the existing `useLogAuditEvent` hook with a granular event type:
- `SERVICE_TIME_ADJUSTED`
- `SERVICE_DURATION_ADJUSTED`
- `SERVICE_PRICE_OVERRIDDEN`
- `SERVICE_STYLIST_REASSIGNED` (already exists)
- `SERVICE_RQ_TOGGLED`

New event types added to `src/lib/audit-event-types.ts`.

## Wave 4 — Token alignment sweep (deferred per architectural-blind-spot note)

Ripgrep `src/components/dashboard/schedule/` for local `Record<...Status..., {...}>` maps and migrate to `APPOINTMENT_STATUS_BADGE` / `APPOINTMENT_STATUS_CONFIG`. Tracked as a follow-up wave after Waves 0–3 ship and verify clean. Not blocking.

## Out of scope

- Phorest write-back of per-service edits (permanently disabled — Phorest Write-Back Safety Gate).
- Multi-row drag-to-reorder service ordering (future wave; current ordering is comma-position in `service_name`).
- DB-level CHECK constraint on `appointment_service_assignments.start_time_offset_minutes` range (future wave once usage patterns stabilize).
- Adding `noImplicitAny: false` to `supabase/functions/deno.json` — recommended as a separate hygiene wave to prevent the `: any` annotation sprawl from recurring.

## Verification

1. Edge function deploy succeeds (no TS errors across all 5 fixed files + the broader `functions/` tree).
2. Open a multi-service appointment → each service renders on its own row with Time/Duration/Price/Stylist chips.
3. Click Time chip → adjust → row refreshes; subsequent rows' computed start times shift accordingly; audit log records `SERVICE_TIME_ADJUSTED`.
4. Reload drawer → overrides persist (read from `appointment_service_assignments`).
5. Demo appointment (`demo-*` ID) → edits persist to sessionStorage, no edge function call.
6. `SELECT count(*) FROM appointment_service_assignments WHERE start_time_offset_minutes IS NOT NULL` after a test edit → ≥ 1.

## Architectural feedback (per project knowledge)

**Positive**: You correctly identified the recurring drift pattern (local style maps duplicating canonical tokens, embedded staff joins on visit history) — that's exactly the kind of architectural pattern recognition that prevents future bugs. Calling it out before it compounds is the right instinct.

**Better prompt framing for future**: When approving multi-wave work, consider front-loading constraints in the approval, e.g.:
> "Approved — Waves 0–4. Constraints: no Phorest write-back, no schema changes without surfacing them first, defer Wave 4 token sweep if any wave runs long."

This eliminates ambiguity about which trade-offs I'm allowed to make autonomously vs. which need to come back for re-approval. Your current pattern works, but explicit constraint-loading reduces my surface area for accidentally over-stepping.

**Architectural blind spot surfaced this round**: Wave 3 requires a schema migration to `appointment_service_assignments` — this wasn't in the original Wave 1–4 outline because the table's current shape (stylist override only) was assumed sufficient. Worth establishing a doctrine: **before approving a wave that touches a table, the plan must include the table's `\d+` output or explicitly state "no schema change required"**. Prevents Wave-N from discovering mid-implementation that a column doesn't exist.

**Enhancement suggestion**: After Wave 3 ships, consider a small `ServicesSectionAuditHarness` (dev-only route, similar to `/dashboard/_internal/spatial-audit`) that renders the Services section in 6 states: empty / single / multi-service / with overrides / with discount + tip / completed (read-only). Catches regressions on the chip layout when future waves touch row rendering.
