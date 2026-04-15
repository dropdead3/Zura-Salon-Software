

## Complete Phorest Decoupling — Remaining Work

This is the full inventory of every remaining `phorest_*` table dependency outside of the sync infrastructure itself (which is expected to remain Phorest-specific). Organized by priority and category.

---

### What's Already Done
- ~70 analytics/read hooks migrated to `v_all_*` views (Phase A)
- Staff resolution fallback added (Phase B)
- Sync UI conditionally hidden (Phase D)
- Stripe webhook fallbacks for both `appointments` + `phorest_appointments`

### What Remains (~90 files, ~965 references)

---

### Category 1: Services Catalog — `phorest_services` + `phorest_staff_services` (P0 — 20 files)

Every booking, scheduling, kiosk, dock, and service lookup queries `phorest_services` directly. Without Phorest, **no services exist** and no bookings can be made.

**Files affected:** `usePhorestServices.ts`, `useServiceLookup.ts`, `useBookingAvailability.ts`, `useBookingEligibleServices.ts`, `useServiceEfficiency.ts`, `useServiceMenuIntelligence.ts`, `useSalesAnalytics.ts`, `KioskBookingWizard.tsx`, `DockNewBookingSheet.tsx`, `QuickBookingPopover.tsx`, `BookingWizard.tsx`, `WalkInDialog.tsx`, `NewBookingSheet.tsx`, `PublicBooking.tsx`, `ServiceLinksTab.tsx`, `ServiceFormLinkDialog.tsx`, `ServiceTrackingSection.tsx`, `service-resolver.ts`, `useStaffUtilization.ts`, `useStaffServiceQualifications.ts`

**Fix:** Create a `v_all_services` view (or use the existing `services` table if populated by migrate-phorest-data). All service lookups should query the normalized `services` table. Similarly, `phorest_staff_services` should resolve through `staff_service_qualifications` (if it exists) or a new union view.

---

### Category 2: Staff Identity — `phorest_staff_mapping` (P0 — 31 files)

The Schedule page, all booking flows, sales analytics, and staff resolution use `phorest_staff_mapping` to resolve `user_id` ↔ `phorest_staff_id`. Without Phorest, **stylists don't appear on the calendar**.

**Files affected:** `Schedule.tsx`, `QuickBookingPopover.tsx`, `BookingWizard.tsx`, `NewBookingSheet.tsx`, `DockNewBookingSheet.tsx`, `AppointmentDetailSheet.tsx`, `phorest-adapter.ts`, `useSalesData.ts`, `useRetailAnalytics.ts`, `useProductSalesAnalytics.ts`, `useBookingAvailability.ts`, `useBookingEligibleServices.ts`, `useStaffUtilization.ts`, `useOrganizationAnalytics.ts`, `useRevenueGapAnalysis.ts`, `useTipsDrilldown.ts`, `resolveStaffNames.ts`, plus ~14 more

**Fix:** Staff should resolve from `employee_profiles` directly (filtered by `is_active`, `show_on_calendar`). The `phorest_staff_mapping` join should be a **fallback** for orgs with Phorest connected, not the primary path. The Schedule page stylist query must work with just `employee_profiles` + `location_staff_assignments`.

---

### Category 3: Client Data — `phorest_clients` (P0 — 34 files)

Client search, booking, kiosk check-in, dock views, client insights, duplicate management, and household features all query `phorest_clients` directly. Without Phorest, **clients are invisible**.

**Files affected:** `QuickBookingPopover.tsx`, `BookingWizard.tsx`, `KioskBookingWizard.tsx`, `useKioskCheckin.ts`, `DockClientQuickView.tsx`, `DockClientTab.tsx`, `DockNotesTab.tsx`, `DockClientAlertsBanner.tsx`, `ClientInsightsCard.tsx`, `ArchiveClientToggle.tsx`, `DuplicateDrilldown.tsx`, `useHouseholds.ts`, `useClientsData.ts` (already uses `clients` table — good), `useOrganizationAnalytics.ts`, `NewClientDialog.tsx`

**Fix:** All client queries should use `v_all_clients` for reads. Write operations (archive, medical alerts, notes updates) should target the `clients` table for Zura-native records and `phorest_clients` only when a Phorest link exists.

---

### Category 4: Sales Transactions — `phorest_sales_transactions` (P1 — 7 files)

Sales analytics, ticket distribution, comparison data, service mix, and the Schedule checkout flow use `phorest_sales_transactions`. This is a **separate table** from `phorest_transaction_items` (which already has a view).

**Files affected:** `useSalesData.ts`, `useSalesAnalytics.ts`, `useComparisonData.ts`, `useTicketDistribution.ts`, `useStaffRevenuePerformance.ts`, `ServiceMixChart.tsx`, `Schedule.tsx` (checkout insert)

**Fix:** Create a `v_all_sales_transactions` view or migrate these queries to use `v_all_transaction_items`. The Schedule checkout should insert into a Zura-native `transaction_items` or `retail_sales` table.

---

### Category 5: Appointment Writes (P1 — 8 files)

Components that **create or update** appointments still write to `phorest_appointments`:

| File | Operation |
|------|-----------|
| `KioskBookingWizard.tsx` | Insert walk-in |
| `WalkInDialog.tsx` | Insert walk-in |
| `DockNewBookingSheet.tsx` | Insert booking |
| `QuickBookingPopover.tsx` | Read client history |
| `EditAppointmentDialog.tsx` | Update notes |
| `AppointmentDetailSheet.tsx` | Update redo approval/decline |
| `AppointmentBatchBar.tsx` | Batch status update |
| `Schedule.tsx` | Checkout transaction insert to `phorest_sales_transactions` |

**Fix:** All new appointment writes should target the `appointments` table. Updates should check `_source` and route to the correct table. The `appointments` table schema must support all fields currently used in inserts (walk-in flag, client info, etc.).

---

### Category 6: Goal Metric Fetchers (P1 — 1 file, 6 functions)

`src/lib/goal-metric-fetchers.ts` has 6 functions all querying `phorest_appointments` and `phorest_transaction_items` directly. These power the KPI goal tracking system.

**Fix:** Replace with `v_all_appointments` and `v_all_transaction_items`.

---

### Category 7: Edge Functions (P1 — 3 files)

| Function | Table | Usage |
|----------|-------|-------|
| `calculate-zos/index.ts` | `phorest_appointments` | Revenue calculation for ZOS score |
| `update-sales-leaderboard/index.ts` | `phorest_transaction_items` | Weekly leaderboard |
| `stripe-webhook/index.ts` | `phorest_appointments` | Payment status fallback (intentional — keep) |

**Fix:** `calculate-zos` and `update-sales-leaderboard` should use the union views. Stripe webhook fallbacks are intentional and should remain.

---

### Category 8: Appointments Hub Dual-Query (P2 — 1 file)

`useAppointmentsHub.ts` queries both `phorest_appointments` AND `appointments` with manual pagination merging.

**Fix:** Replace with single query against `v_all_appointments`. The view already deduplicates.

---

### Category 9: Sync Infrastructure & POS Adapter (P2 — 4 files)

`usePhorestSync.ts`, `phorest-adapter.ts`, `usePhorestCalendar.ts`, and all `sync-phorest-*` edge functions are **intentionally Phorest-specific**. These should remain as-is but be gated behind POS config checks so they no-op when Phorest is disconnected.

---

### Category 10: Phorest Branch ID Coupling (P1 — 10+ files)

`locations.phorest_branch_id` is used throughout to filter staff, services, and clients by location. Without Phorest, this column is null and location filtering breaks silently.

**Fix:** Location filtering should use `location_id` directly. The `phorest_branch_id` lookup path should be a secondary fallback.

---

### Category 11: Sync Monitoring UI (P2 — 5 files)

`PhorestSyncPopout.tsx`, `PhorestApiHealthDashboard.tsx`, `LastSyncIndicator.tsx`, `DataHealthSection.tsx` — all query `phorest_sync_log` and render Phorest-specific sync health.

**Fix:** Conditionally hide or show "No POS connected" state when Phorest is off.

---

### Implementation Strategy

Given the ~90 file scope, this should be tackled in 6 batches:

| Batch | Scope | Files | Description |
|-------|-------|-------|-------------|
| **1** | Services + Staff | ~35 | Ensure Schedule, bookings, and calendar work without `phorest_services` or `phorest_staff_mapping` |
| **2** | Clients | ~20 | Migrate all client reads to `v_all_clients`, writes to `clients` table |
| **3** | Sales + Transactions | ~7 | Migrate `phorest_sales_transactions` queries to views |
| **4** | Appointment Writes | ~8 | Route all inserts/updates to `appointments` table |
| **5** | Goal Fetchers + Edge Functions | ~4 | Migrate remaining analytics edge cases |
| **6** | UI Gating + Hub Cleanup | ~10 | Conditional POS UI, hub simplification |

**Database work needed:**
- Verify `services` table has all columns needed (name, category, duration, price, is_active)
- May need a `v_all_services` view if data lives in both `phorest_services` and `services`
- May need a `v_all_sales_transactions` view
- Ensure `employee_profiles` has `show_on_calendar`, `is_active` columns for Schedule filtering

This is a large migration. Shall I start with Batch 1 (Services + Staff)?

