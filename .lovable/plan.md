

## Prompt review

Strong, open-ended audit prompt — exactly the right cadence after shipping three back-to-back waves (18.2, 19, 21). Sharper next time: scope the audit dimension you care about most ("audit *security*", "audit *Wave 21 behavior*", "audit *unrelated regressions*"), and name the pri threshold you want surfaced ("only P0/P1, defer P2"). Without that, I default to a full-stack pass which can include noise. I've ranked findings by leverage and explicitly anchored each to a doctrine clause so you can decide what ships.

## Audit — Build state after Waves 18.2 / 19 / 21

**Health baseline:** TypeScript clean (no errors). Dev server stable (HMR warnings only — `getDateRange` Fast Refresh export shape, pre-existing). Supabase linter shows pre-existing infra warnings, no new findings from Wave 21.

### P0 — Behavioral gap in the rebook gate (the wave you just shipped)

| # | Finding | Doctrine anchor | Leverage |
|---|---|---|---|
| 1 | **Sheet-close bypasses the gate.** `PremiumFloatingPanel`'s built-in close button (×) calls `onOpenChange(false)` — staff can dismiss `CheckoutSummarySheet` while still in `gatePhase === 'gate'` without picking rebook OR a decline reason. That's the exact "implicit skip" loophole flagged as the open question in the Wave 21 plan and never closed. Fix: when `gatePhase === 'gate'` and the user attempts to close, intercept → open `RebookDeclineReasonDialog` first; only allow close after reason captured (or after rebook completed). | structural-enforcement-gates | high |
| 2 | **`onBookInterval` discards the chosen interval.** In `CheckoutSummarySheet.tsx` L694–699, the callback receives `interval: RebookInterval` but only calls `onScheduleNext(appointment)` — the staff's tap on "+4 weeks" vs "+6 weeks" is thrown away. The schedule-next flow opens with no preselected date, so the one-tap UX is cosmetic. Fix: extend `onScheduleNext` signature to `(apt, interval?)` and prefill the booking date in `Schedule.tsx` handler. | UX Canon (one primary lever, expandable logic) | high |
| 3 | **Rebook completion never advances `gatePhase`.** Tapping a quick-book interval calls `onScheduleNext` but does NOT set `setGatePhase('checkout')` or `setRebooked(true)`. Staff are stuck in the gate UI until they manually trigger the `rebookCompleted` prop round-trip from parent — and that prop only flips after the schedule-next flow completes asynchronously. If the parent flow is cancelled, the gate is permanently stuck. Fix: optimistically advance to `checkout` phase on interval tap; let `rebookCompleted` confirm the boolean for `onConfirm`. | UX Canon (calm/executive, no dead ends) | high |

### P1 — Data integrity & analytics gaps

| # | Finding | Doctrine anchor | Leverage |
|---|---|---|---|
| 4 | **Decline reason is logged twice with mismatched semantics.** `useLogRebookDeclineReason` writes to `rebook_decline_reasons` table AND mirrors to `appointment_audit_log` with `REBOOK_DECLINED`. Then `handleConfirm` *also* passes `finalReason` through `onConfirm` → `Schedule.tsx` writes the same reason as a free-text string to `appointments.rebook_declined_reason`. Three writes, three formats (structured row, audit metadata, free-text column) — drift risk for analytics. Fix: keep the structured table as system of record; treat `rebook_declined_reason` column as a denormalized cache (write the `reason_code`, not the human label). | analytics-data-integrity | medium |
| 5 | **Analytics card has no drill-down.** Plan called for "click bar → list of appointments with that reason (link to drawer)". Card renders bars but they're not interactive. Fix: wrap each bar in a button → opens a `Sheet` listing `appointment_id`s with that reason for the date range, each linking to `AppointmentDetailSheet`. | leverage-doctrine (one primary lever, drill-down logic) | medium |
| 6 | **`location_id` foreign key mismatch.** Migration declares `location_id TEXT REFERENCES public.locations(id)`. Confirm `locations.id` is `text` (slug) per `location-identity-and-slugs` doctrine — if it's `uuid` in this project, the FK fails. (Likely fine given the doctrine, but worth a one-query verification before this bites silently.) | location-identity-and-slugs | low |
| 7 | **Reason `staff_id` is always null in practice.** Code reads `(appointment as any).staff_user_id` which doesn't exist on `PhorestAppointment` — should be `staff_member_id` or resolved via `phorest_staff_id → employee_profiles`. Result: per-stylist decline analytics are blind. Fix: resolve staff via the same path used by `useStaffAttribution`, or fall back to `appointment.stylist_profile?.id`. | staff-mapping-constraints | high (kills per-stylist coaching) |

### P2 — UI polish (defer with explicit triggers)

| # | Finding | Trigger to revisit |
|---|---|---|
| 8 | `RebookDeclineReasonDialog` uses `font-medium` + `font-medium` for both title AND each radio label — no hierarchy. Should use `font-display` for the title per UI Canon (Termina uppercase). | First user feedback that the dialog feels flat |
| 9 | `Sparkles` icon used both for the dialog header AND the `NextVisitRecommendation` header — two sparkles in a row when both render. Differentiate. | Visual QA round |
| 10 | `RebookDeclineReasonsCard` lives only in `OperationsTabContent` — not pinnable to Command Center. Plan called for `PinnableCard` wrapping. | When an operator pins it from elsewhere or asks |
| 11 | "Other" textarea has no character cap — could store novels. Add `maxLength={500}`. | First abuse / when surfaced in coaching reviews |
| 12 | Bar chart has no x-axis scale or "biggest lever" callout on the bar itself (only in headline). Could highlight the `never_asked` bar with an inline label. | Operator feedback round |

### Recommended ship order

**Wave 21.1 (this revise):** Fix P0 #1, #2, #3 + P1 #7. These are the gate's structural integrity — without them the wave doesn't deliver its promise (force the ask). Single PR, ~80–120 LOC across 3 files.

**Wave 21.2 (next):** P1 #4, #5, #6. Analytics integrity + drill-down. Separate PR because it touches the Schedule.tsx write path and needs a small data migration to normalize the `rebook_declined_reason` column.

**Defer:** All P2 to a future polish wave with stated triggers.

### Files Wave 21.1 would touch

- `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — intercept close in `gate` phase; advance phase on interval tap; pass interval through
- `src/components/dashboard/schedule/NextVisitRecommendation.tsx` — pass interval up cleanly (already does)
- `src/pages/dashboard/Schedule.tsx` — accept optional `interval` from `onScheduleNext`, preselect booking date
- `src/hooks/useRebookDeclineReasons.ts` — fix `staffId` resolution (or do it at call site in CheckoutSummarySheet using `stylist_profile?.id`)

### Acceptance checks for 21.1

1. Close × in gate phase opens decline dialog; cannot dismiss sheet until reason captured OR rebook completed
2. Tap "+4 weeks" → schedule-next opens with that date prefilled, gate optimistically advances to checkout phase
3. If schedule-next is cancelled, staff returns to checkout phase with `rebooked=false` (not stuck in gate)
4. `rebook_decline_reasons.staff_id` populated for non-anonymous bookings
5. TS clean, tests still passing

