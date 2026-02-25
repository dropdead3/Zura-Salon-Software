

## Pre-Checkout Rebooking Gate -- Gap Analysis and Enhanced Plan

Your original prompt was well-structured -- it identified a behavioral gap (passive rebook toggle after the fact vs. active gate before payment) and correctly scoped the UX states. Here are the gaps and enhancements I found after deep-diving the codebase.

---

### Gaps Identified in the Original Plan

**Gap 1: Existing rebook infrastructure already exists -- reuse it, don't duplicate**

`Schedule.tsx` already has a `rebookData` state (lines 163-169) and an `onRebook` handler (lines 729-741) that pre-fills the `QuickBookingPopover` with client, stylist, and service data. The original plan proposed building a "mini-wizard" inside the detail panel footer. This would duplicate the existing booking flow and create two booking paths to maintain.

**Better approach:** The "Schedule Next Appointment" button in the gate should trigger the existing `onRebook` flow (opening `QuickBookingPopover`) but with a callback that marks the rebooking decision as resolved. No new booking wizard needed.

**Gap 2: Service IDs not passed in the existing rebook handler**

The current `onRebook` handler (line 739) passes `selectedServices: []` -- an empty array. For the gate to pre-populate with the same services, we need to resolve service IDs from `appointment.service_name` (comma-separated names) using the existing `useServiceLookup` hook.

**Fix:** Populate `selectedServices` from the appointment's service name string by looking up IDs in the service catalog.

**Gap 3: Two checkout entry points -- detail panel and TodaysQueueSection**

`TodaysQueueSection.tsx` (line 301) also renders a `CheckoutSummarySheet`. If the gate only exists in `AppointmentDetailSheet`, the queue cards bypass it entirely. The gate needs to be enforced at the data level, not just the UI level.

**Fix:** Add the rebooking gate to `CheckoutSummarySheet` itself (before the confirm button), so it's enforced regardless of entry point. This is cleaner than gating in two parent components.

**Gap 4: No persistence of the decline reason**

The `phorest_appointments` table has no `rebook_declined_reason` column. Without a migration, the decline reason can only be stored in the audit log. This is acceptable for Phase 1 but limits future analytics queries (audit log JSON vs. a queryable column).

**Recommendation:** Add a DB migration for `rebook_declined_reason` on `phorest_appointments`. This enables direct SQL analytics on decline reasons without parsing audit log JSON.

**Gap 5: The rebooked toggle in CheckoutSummarySheet becomes redundant**

Lines 538-552 of `CheckoutSummarySheet.tsx` show a manual "Client Rebooked?" toggle. If the gate resolves the rebook decision before checkout opens, this toggle should auto-set and become read-only (showing the decision made), not remain independently toggleable.

---

### Enhanced Plan

#### 1. DB Migration

Add column to `phorest_appointments`:

```sql
ALTER TABLE phorest_appointments
  ADD COLUMN IF NOT EXISTS rebook_declined_reason TEXT;
```

No RLS changes needed -- existing policies cover this table.

#### 2. Move the Gate into CheckoutSummarySheet (single enforcement point)

Instead of gating in the detail panel footer (which only covers one entry point), add the rebooking decision as the first step inside `CheckoutSummarySheet.tsx`. Before showing tip/payment, the sheet displays:

- **Primary CTA:** "Schedule Next Appointment" -- opens the existing `QuickBookingPopover` via a new callback prop
- **Secondary link:** "Client doesn't want to rebook" -- expands decline reason selector
- **After decision:** Sheet transitions to the existing checkout content with the rebook toggle auto-set and read-only

This enforces the gate from both the detail panel Pay button and the TodaysQueueSection checkout.

#### 3. New callback prop on CheckoutSummarySheet

```typescript
interface CheckoutSummarySheetProps {
  // ... existing props
  onScheduleNext?: (apt: PhorestAppointment) => void; // triggers QuickBookingPopover
}
```

When "Schedule Next Appointment" is clicked, the sheet calls `onScheduleNext`, which triggers the existing rebook flow in `Schedule.tsx`. After booking completes, a callback sets `rebooked = true` in the checkout sheet.

#### 4. Decline Reason UI (inside CheckoutSummarySheet)

Default reasons:
1. "Wants to check their schedule first"
2. "Prefers to book online later"
3. "Budget concerns"
4. "Trying a different salon"
5. "Other" (free-text required, minimum 3 characters)

On decline confirmation:
- Sets `rebooked = false` in local state
- Stores reason in appointment update payload (new `rebook_declined_reason` column)
- Logs to audit trail via `useLogAuditEvent`

#### 5. Wire in Schedule.tsx

- Pass `onScheduleNext` to `CheckoutSummarySheet` that triggers the existing `rebookData` + `QuickBookingPopover` flow
- Pass a `onRebookComplete` callback to `QuickBookingPopover` that signals back to `CheckoutSummarySheet`

#### 6. Update handleCheckoutConfirm

```typescript
const handleCheckoutConfirm = (tipAmount: number, rebooked: boolean, promoResult?, declineReason?: string) => {
  handleStatusChange('completed', { 
    rebooked_at_checkout: rebooked, 
    tip_amount: tipAmount,
    rebook_declined_reason: declineReason || null,
  });
};
```

---

### Additional Utilities Recommended

**1. Service Name-to-ID resolver utility**

The existing rebook handler passes `selectedServices: []`. A utility function that resolves comma-separated service names back to service IDs from the catalog would make the pre-population work correctly.

```typescript
// src/lib/service-resolver.ts
export function resolveServiceIds(
  serviceNameString: string,
  serviceCatalog: ServiceLookupEntry[]
): string[]
```

**2. Rebooking analytics hook**

A `useRebookDeclineReasons` hook that aggregates decline reasons by frequency, stylist, and time period. This feeds a future analytics card showing *why* clients aren't rebooking -- directly actionable intelligence for operators.

**3. Audit log event type constants**

Currently event types are raw strings (`'rebook_declined'`, `'status_changed'`). A shared constants file prevents typos across components:

```typescript
// src/lib/audit-event-types.ts
export const AUDIT_EVENTS = {
  REBOOK_DECLINED: 'rebook_declined',
  REBOOK_COMPLETED_AT_CHECKOUT: 'rebook_completed_at_checkout',
  // ... existing events
} as const;
```

---

### Files Changed

| File | Change |
|---|---|
| `supabase/migrations/xxxx_add_rebook_declined_reason.sql` | Add `rebook_declined_reason` column |
| `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | Add rebooking gate as first step before payment content; auto-set rebook toggle after decision |
| `src/pages/dashboard/Schedule.tsx` | Pass `onScheduleNext` to CheckoutSummarySheet; wire rebook completion callback |
| `src/components/dashboard/TodaysQueueSection.tsx` | Pass `onScheduleNext` to its CheckoutSummarySheet instance |
| `src/lib/service-resolver.ts` | New utility -- resolve service names to IDs |
| `src/lib/audit-event-types.ts` | New utility -- shared audit event type constants |

### What Does NOT Change

- `AppointmentDetailSheet.tsx` footer -- Pay button behavior stays identical (no gate here, gate is inside CheckoutSummarySheet)
- `QuickBookingPopover` -- no changes, it already accepts rebook data
- Appointment lifecycle transitions
- Existing rebooking rate analytics (`useRebookingRate.ts`) -- they read `rebooked_at_checkout` which remains the same column

