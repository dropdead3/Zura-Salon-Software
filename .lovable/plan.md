

## Goal
Add a third visual state to the rebook gate area: after the operator skips with a reason, replace the amber warning block with a subtle muted confirmation line that names the captured reason and confirms it's logged to staff reports.

## Why this matters
Closes the visibility loop. Today after skip, the warning block disappears silently and the Charge buttons appear — the operator's action vanishes from the UI. A muted confirmation reinforces:
- The skip *was* captured (not lost)
- The reason is on the record (transparency, not surveillance)
- Tracking flows to staff reports (doctrine alignment, no extra toast noise)

Aligns with: *Silence is valid output, but completed structural actions deserve a quiet receipt.*

## Three states (under Checkout Total)

```
State 1 — GATE ACTIVE (rebook not handled)
┌──────────────────────────────────────────────┐
│ [warning] Rebook Required to Continue        │
│ Book the next visit above, or skip…          │
│ [Book Next Visit]   [Skip Rebook]            │
└──────────────────────────────────────────────┘

State 2 — REBOOKED (next visit confirmed)
(no block — gate cleared cleanly, total goes full contrast)

State 3 — SKIPPED (new)
[CheckCircle2 icon · muted]  Rebook skipped — reason: Client traveling · logged to staff report
```

## Scope (single file)

**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

### Detection
The decline-reason mutation (`useLogRebookDeclineReason`) currently writes to `rebook_decline_reasons` and mirrors to `appointment_audit_log` as `REBOOK_DECLINED`. Two paths to detect "skipped":

1. **Local state** (preferred for v1): When `RebookDeclineReasonDialog.onConfirm` fires, capture `{ reasonCode, reasonNotes }` into a new `declinedReason` state alongside the existing `setDeclineDialogOpen(false)` call.
2. **Audit log re-hydration** (out of scope for this wave): On sheet remount, query `appointment_audit_log` for `REBOOK_DECLINED` events on this appointment so the receipt persists across refreshes. Logged for next wave.

Local state is enough — the sheet is a per-checkout session; if the operator closes and reopens, the appointment will already be paid (gate doesn't re-evaluate post-settle).

### Visibility logic
```
gatePhase === 'gate' && !declinedReason  → State 1 (warning block)
rebooked === true                         → State 2 (no block)
declinedReason !== null                   → State 3 (muted receipt)
```

### Receipt component (inline, no new file)
- Container: `flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground`
- Icon: `CheckCircle2 w-3.5 h-3.5 text-muted-foreground/70`
- Copy: `Rebook skipped — reason: {getReasonLabel(declinedReason.code)} · logged to staff report`
- For `'other'` reason: append truncated note up to 40 chars: `… · "{notes.slice(0,40)}{notes.length>40?'…':''}"`
- No CTAs, no border, no background tint — quiet by design

### Reuse `getReasonLabel`
Already exported from `useRebookDeclineReasons.ts` — converts code (`client_traveling`) to human label (`Client declined — traveling / out of town`). Trim the prefix for the receipt: show just `Client traveling` style (use the post-em-dash slice, fall back to full label if no em-dash).

## Token compliance
- `text-muted-foreground` (existing semantic token, theme-aware)
- `font-sans text-xs` (Aeonik Pro, body, not uppercase)
- `CheckCircle2` from lucide (already imported elsewhere in file)
- No new tokens, no palette literals

## Out of scope
- Audit-log re-hydration on sheet remount (logged: revisit when checkout supports resumable drafts)
- Persistent "skipped" badge on closed appointment cards in calendar (separate visibility wave already noted)
- Undo affordance on the receipt (skip is intentionally final per session — operator must reopen the dialog flow if they change their mind, which preserves audit trail integrity)

## File to modify
1. `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — add `declinedReason` state, capture in `RebookDeclineReasonDialog.onConfirm`, render 3-state conditional under Checkout Total

