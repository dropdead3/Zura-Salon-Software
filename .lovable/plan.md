

# Appointments & Transactions Hub -- Consolidated Plan

## Overview

A unified operational hub that consolidates the full appointment lifecycle (past, present, future) and financial transactions into a single searchable, filterable interface. Includes a new audit trail system, enhanced search, refund management, and cross-linking between appointments and their associated transactions.

This replaces the current standalone `/dashboard/transactions` page by absorbing its functionality into the hub.

---

## Phase 1 (This Build)

### A. Database: Appointment Audit Log

New table `appointment_audit_log` to capture every meaningful change:

- **Event types**: `created`, `status_changed`, `rescheduled`, `edited`, `redo_flagged`, `redo_approved`, `redo_declined`, `checked_in`, `completed`, `cancelled`, `no_show`, `note_added`
- Tracks: who did it (`actor_user_id`, `actor_name`), what changed (`previous_value`, `new_value` as JSONB), when (`created_at`)
- Organization-scoped with RLS (org members can read; writes via service role or authenticated inserts)
- Indexes on `appointment_id` and `organization_id`

### B. Database: Schema Enhancements

1. **`phorest_appointments`**: Add `created_by UUID REFERENCES auth.users(id)` -- tracks who originally scheduled the appointment
2. **`phorest_transaction_items`**: Add `appointment_id UUID REFERENCES phorest_appointments(id)` -- links a transaction line item back to the specific appointment it was generated from (enables appointment-to-checkout tracing)
3. **`phorest_transaction_items`**: Add `payment_method TEXT` -- Cash, Card, Gift Card, Salon Credit (populated during checkout or sync)
4. **`phorest_transaction_items`**: Add `stylist_name TEXT` -- denormalized for display without join

### C. Edge Function Updates

1. **`create-phorest-booking`**: Write initial audit entry (`created` event) with actor info and set `created_by`
2. **`update-phorest-appointment-time`**: Write `rescheduled` audit entry with old/new date+time

### D. Frontend: Audit Logging from Status Changes

All existing status mutation points (confirm, check-in, complete, no-show, cancel, redo approve/decline) in `AppointmentDetailSheet.tsx` will insert an audit log entry after the status update succeeds.

New hook: `useAppointmentAuditLog.ts`
- `useAuditLog(appointmentId)` -- fetches timeline entries
- `useLogAuditEvent()` -- mutation to insert an entry

### E. Hub Page: `/dashboard/appointments-hub`

**3-tab layout:**

| Tab | Content |
|-----|---------|
| **Appointments** | All phorest_appointments (past/present/future). Filterable by date range, status, stylist, location. Searchable by client name, email, or phone (joined via phorest_clients). Click a row to open the detail drawer. |
| **Transactions** | Migrated from existing Transactions page. Same filters + stats cards + refund/credit dialogs. Enhanced with stylist name display and appointment linking. |
| **Gift Cards** | Current GiftCardManager component (already exists). |

**Unified search bar** at the top of the page: searches across both tabs by client name, email, or phone number.

**Pagination**: Server-side cursor pagination for both appointments and transactions to handle high-volume orgs (no 1,000-row ceiling).

### F. Appointment Detail Drawer

Slide-out panel when clicking an appointment row:

- **Summary section**: Client, service, stylist, date/time, price, current status badge, location
- **Audit Timeline**: Chronological list of all events from `appointment_audit_log` -- each entry shows event icon, actor name, timestamp, and what changed
- **Linked Transaction**: If `appointment_id` exists on a transaction item, show a "Checkout Details" section with line items, payment method, and total
- **Communications placeholder**: A disabled section labeled "Communications -- Coming Soon" for future SMS/email log integration

### G. Refund Approval Queue

The Transactions tab gets a sub-filter: "Pending Refunds" badge that filters to `refund_records` with `status = 'pending'`. This surfaces refunds awaiting manager approval inline rather than requiring a separate page.

### H. Navigation

- Add to `managerNavItems` under `operations` group:
  `{ href: '/dashboard/appointments-hub', label: 'Appointments & Transactions', icon: Receipt, permission: 'view_transactions', managerGroup: 'operations' }`
- The existing `/dashboard/transactions` route will redirect to `/dashboard/appointments-hub?tab=transactions` for backward compatibility
- Add to `hubLinksConfig` for Management Hub visibility

### I. Export

Both tabs get a "Download CSV" button in the header area. Uses client-side CSV generation from the currently filtered dataset (no new backend needed). PDF export is deferred to a future phase.

---

## Phase 2 (Future -- Not Built Now)

- Client communication timeline (SMS/email sent/received) once communication flows are operational
- Post-checkout communication flow display
- Cancellation / no-show fee enforcement infrastructure
- Bulk refund processing
- PDF export
- Real-time updates via Supabase Realtime on the audit log

---

## New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/{timestamp}_appointment_audit_log.sql` | Audit log table, schema additions, RLS, indexes |
| `src/pages/dashboard/AppointmentsHub.tsx` | Hub page with 3 tabs and unified search |
| `src/components/dashboard/appointments-hub/AppointmentsList.tsx` | Filterable, paginated appointments table |
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Slide-out with summary + audit timeline + linked transaction |
| `src/components/dashboard/appointments-hub/AppointmentAuditTimeline.tsx` | Chronological event timeline component |
| `src/components/dashboard/appointments-hub/HubSearchBar.tsx` | Unified search across name/email/phone |
| `src/hooks/useAppointmentAuditLog.ts` | Query + mutation hooks for audit entries |
| `src/hooks/useAppointmentsHub.ts` | Paginated appointment listing with search/filter |

## Modified Files

| File | Change |
|------|--------|
| `supabase/functions/create-phorest-booking/index.ts` | Write audit entry on creation; set `created_by` |
| `supabase/functions/update-phorest-appointment-time/index.ts` | Write audit entry on reschedule |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Insert audit entries on status changes |
| `src/config/dashboardNav.ts` | Add hub nav entry + hub link |
| `src/App.tsx` | Register `/dashboard/appointments-hub` route; redirect old `/dashboard/transactions` |
| `src/pages/dashboard/Transactions.tsx` | Convert to redirect to hub |

