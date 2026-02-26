

## Three Enhancements: Cancellation Waitlist, Service Menu Intelligence, and Today's Prep Quick-Link

These are three independent features at different scales. Here is the plan for each.

---

### Enhancement 1: Pre-Visit Prep Link from Schedule Header

**Scope**: Small. Add a quick-link icon button to the Schedule header's dark bar (right-side action group, next to Assistant Blocks / Drafts / Settings).

| File | Change |
|------|--------|
| `src/components/dashboard/schedule/ScheduleHeader.tsx` | Add a `ClipboardCheck` icon button between the Drafts button and the Settings button. Links to `/dashboard/today-prep`. Tooltip reads "Today's Prep". Matches existing ghost-button style with the dark header palette. Only visible when the current date is today (since prep is same-day only). |

No new hooks, no backend changes. Single-file edit.

---

### Enhancement 2: Cancellation Waitlist

**Scope**: Medium-large. New table, RLS, hook, UI components, route, and nav entry.

**Data Model**

New table: `waitlist_entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `organization_id` | uuid FK → organizations | RLS scoping |
| `client_id` | uuid nullable | FK → phorest_clients |
| `client_name` | text | Denormalized for display |
| `client_phone` | text nullable | For contact |
| `client_email` | text nullable | For contact |
| `service_name` | text nullable | Requested service(s) |
| `preferred_stylist_id` | uuid nullable | FK → employee_profiles.user_id |
| `preferred_date_start` | date | Earliest acceptable date |
| `preferred_date_end` | date nullable | Latest acceptable date |
| `preferred_time_start` | time nullable | Earliest acceptable time |
| `preferred_time_end` | time nullable | Latest acceptable time |
| `status` | text | `waiting`, `offered`, `booked`, `expired`, `cancelled` |
| `priority` | int | Default 0 (higher = more urgent) |
| `notes` | text nullable | |
| `offered_at` | timestamptz nullable | When a match was offered |
| `resolved_at` | timestamptz nullable | When booked or expired |
| `created_by` | uuid | auth.uid() |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Default now() |

RLS: `is_org_member(auth.uid(), organization_id)` for read; `is_org_admin(auth.uid(), organization_id)` for write.

**Hook**

New: `src/hooks/useWaitlist.ts`
- `useWaitlistEntries(orgId, filters)` — fetch active entries, sorted by priority then created_at
- `useAddWaitlistEntry()` — mutation to insert
- `useUpdateWaitlistStatus()` — mutation to update status (offer, book, cancel, expire)

**UI Components**

New directory: `src/components/dashboard/waitlist/`

| Component | Purpose |
|-----------|---------|
| `WaitlistTable.tsx` | Sortable table of active waitlist entries with status badges, contact info, preferred dates/times |
| `AddWaitlistEntryDialog.tsx` | Form dialog to add a client to the waitlist (client search, service, date range, time preferences, stylist preference) |
| `WaitlistMatchBanner.tsx` | Inline banner shown in the Schedule page when a cancellation creates a slot that matches a waitlisted client. Shows client name and a "Notify" action. |

**Page**

New: `src/pages/dashboard/Waitlist.tsx` — wraps `DashboardLayout`, renders `WaitlistTable` with filters (status, date range). Page header with "Add to Waitlist" CTA.

**Route & Nav**

| File | Change |
|------|--------|
| `src/App.tsx` | Add route `/dashboard/waitlist` |
| `src/config/dashboardNav.ts` | Add entry in `mainNavItems` after Schedule, with `ClipboardList` icon, permission `view_booking_calendar`, roles for admin/manager/receptionist |

**Matching Logic (Phase 1 — Manual)**

When an appointment is cancelled or no-showed, the system does not auto-notify. Instead, the `WaitlistMatchBanner` component queries active waitlist entries whose date range and time preferences overlap the freed slot, and surfaces them as suggestions. The receptionist/manager clicks "Notify" to mark the entry as `offered` and contacts the client manually.

This follows the autonomy model: Recommend → Approve → Execute. Automated notifications are Phase 2+.

---

### Enhancement 3: Service Menu Intelligence

**Scope**: Medium. New analytics card in the Services tab of the Analytics Hub. No new tables needed — this analyzes existing `phorest_transaction_items` and `phorest_services` data.

**What It Does**

Surfaces three actionable intelligence signals:

1. **Underperforming Services**: Services with declining booking frequency (comparing recent 4 weeks vs prior 4 weeks). Flags services with >25% drop.
2. **High-Margin Opportunities**: Cross-references `useAddonMarginAnalytics` data with booking frequency to identify high-margin services that are underbooked.
3. **Bundle Suggestions**: Extends the existing `ServiceBundlingIntelligence` by adding a "Suggested Bundles" section that pairs frequently co-booked services with pricing recommendations.

**Hook**

New: `src/hooks/useServiceMenuIntelligence.ts`
- Queries `phorest_transaction_items` for the last 8 weeks
- Groups by service, calculates booking trend (recent vs prior period)
- Merges with service cost/margin data from `phorest_services`
- Returns: `decliningServices`, `highMarginUnderbooked`, `suggestedBundles`

**UI Component**

New: `src/components/dashboard/sales/ServiceMenuIntelligence.tsx`
- A `PinnableCard` with three collapsible sections
- **Declining Services**: Table with service name, trend arrow, booking count change, revenue impact
- **High-Margin Underbooked**: Services where margin > 60% but bookings are below median. Action: "Consider promoting"
- **Bundle Opportunities**: Natural pairings from co-booking data with estimated revenue lift if bundled at a discount

**Integration**

| File | Change |
|------|--------|
| `src/components/dashboard/analytics/ServicesContent.tsx` | Add `ServiceMenuIntelligence` as a new section/tab in the Services analytics, after existing Service Bundling Intelligence |

No new route needed — this lives within the existing Analytics Hub under the Services tab.

---

### Implementation Order

| Step | Enhancement | Effort |
|------|-------------|--------|
| 1 | Today's Prep quick-link from Schedule header | Trivial — single file edit |
| 2 | Cancellation Waitlist (table + RLS + hook + UI + route + nav) | Medium — new feature end-to-end |
| 3 | Service Menu Intelligence (hook + card + Analytics Hub integration) | Medium — analytics-only, no new tables |

All three are independent and can be built sequentially without conflicts.

