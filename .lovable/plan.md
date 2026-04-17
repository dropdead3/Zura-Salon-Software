

## Prompt review

Strong prompt — names the surface (checkout), the audience (stylist/front desk), the behavior (require reason on "no"), the cultural goal (force the ask), and even gives one critical reason verbatim ("I never asked"). Sharper next time: specify *when* in the checkout flow it should fire (before payment? after?) and whether it should block other staff from skipping (PIN gate?). I'll propose the cleanest placement and flag the PIN question.

## Discovery

Existing rebook architecture (already in place):
- `NextVisitRecommendation.tsx` — shown inside `CheckoutSummarySheet` rebooking gate (one-tap interval buttons)
- `AUDIT_EVENTS.REBOOK_DECLINED` and `REBOOK_COMPLETED_AT_CHECKOUT` already defined
- `useRebookingRate` hook tracks `rebooked_at_checkout` boolean on appointments
- `appointment_audit_log` table receives lifecycle events

What's missing: when staff clicks "Skip" on `NextVisitRecommendation`, it logs `REBOOK_DECLINED` but captures **no reason**. That's the gap — and where coaching pressure lives.

## Plan — Wave 21: Rebook Decline Reason Gate + Analytics

**Doctrine anchor:** structural enforcement (force the ask), brand-voice (no shame language, explain why structure protects), analytics-data-integrity.

### What gets built

**1. Decline reason modal (blocking gate)**

When staff clicks "Skip" in `NextVisitRecommendation`, instead of immediate decline:
- Open `RebookDeclineReasonDialog` — modal that **must** be answered to proceed
- Single-select radio list of reasons (with "Other" → free text)
- Cannot be dismissed without selecting (no X close, no overlay-click escape)
- Confirm button writes reason → audit log → closes modal → proceeds with checkout
- Helper copy at top: *"Quick coaching moment — capturing why helps the team improve rebook rate. No judgment."*

**Reason options (in order, "I never asked" first as the cultural anchor):**
1. **I never asked** (the honest one — this is the lever)
2. Client declined — traveling / out of town
3. Client declined — wants to call later
4. Client declined — price concern
5. Client declined — schedule uncertainty
6. Service doesn't need rebook (e.g., one-off)
7. Other (free text, required if selected)

**2. Data layer**

New table `rebook_decline_reasons`:
- `id`, `organization_id`, `location_id`, `appointment_id`, `client_id`, `staff_id`
- `reason_code` (text, enum-like: `never_asked`, `client_traveling`, `client_call_later`, `client_price`, `client_schedule_unsure`, `not_applicable`, `other`)
- `reason_notes` (text, nullable — free text for "Other" or supplemental)
- `created_at`, `created_by`
- RLS: `is_org_member` for select, `is_org_member` for insert (staff log their own)

Also write to existing `appointment_audit_log` with `REBOOK_DECLINED` + reason in metadata for backward compat with existing rebook audit queries.

**3. Analytics surface**

New card in **Operations Hub → Rebooking** section: `RebookDeclineReasonsCard.tsx`
- Horizontal bar chart: reason → count + % of total declines
- Date range picker (inherits Hub filter)
- Drill-down: click bar → list of appointments with that reason (link to drawer)
- Headline insight at top: *"X% of declines were 'I never asked' — biggest lever this period"*
- Empty state: *"No decline reasons recorded yet. Reasons capture starts at checkout."*
- Wrapped in `PinnableCard` for Command Center pinning

**4. Drawer surfacing (closing the loop)**

In `AppointmentDetailSheet` audit/timeline tab:
- Decline reason renders inline next to `REBOOK_DECLINED` event (not just "rebook declined" — "rebook declined: I never asked")
- Lets managers spot patterns per stylist without leaving the appointment

### Files

**New:**
- `src/components/dashboard/schedule/RebookDeclineReasonDialog.tsx`
- `src/components/dashboard/analytics/RebookDeclineReasonsCard.tsx`
- `src/hooks/useRebookDeclineReasons.ts` (insert + query)
- Migration: `rebook_decline_reasons` table + RLS

**Modify:**
- `src/components/dashboard/schedule/NextVisitRecommendation.tsx` — Skip button opens dialog instead of firing `onDecline` directly
- `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — wire dialog into rebook gate flow; only proceed when reason captured
- `src/lib/audit-event-types.ts` — add reason metadata convention comment
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — audit timeline displays reason
- `src/pages/dashboard/admin/operations-hub` (or analytics hub rebooking subtab) — mount new card
- `src/config/dashboardNav.ts` — only if new analytics route added (likely just lives under existing Rebooking tab)

### Acceptance checks

1. Click "Skip" in rebook gate → dialog opens, cannot dismiss without selecting a reason
2. "Other" requires free-text before Confirm enables
3. Confirm writes to `rebook_decline_reasons` + `appointment_audit_log`, then proceeds with checkout
4. Analytics card shows reason breakdown with "I never asked" callout
5. Drawer audit timeline shows reason inline with decline event
6. Reason data scoped by `organization_id` (RLS enforced)
7. No regression to one-tap rebook flow (only "Skip" path is gated)

### Open question (worth confirming after approval)

Should this gate also fire when staff closes `CheckoutSummarySheet` without selecting either rebook OR a decline reason? (i.e., closing = implicit skip = should still capture reason.) Default: yes, treat sheet-close-without-rebook as decline → modal blocks close. Tell me if you want a softer flow.

### Deferred

- **P2** PIN-gate the "I never asked" reason (manager-only override) — trigger: when staff start gaming the field
- **P2** Per-stylist decline reason leaderboard — trigger: when 3+ owners ask for it
- **P2** Auto-coaching nudge in stylist profile when "I never asked" exceeds threshold (e.g., >40% of their declines) — trigger: after 30 days of baseline data
- **P2** Public/client-facing version (text-back link asking "want to rebook?") — trigger: when in-person ask rate stabilizes >70%

