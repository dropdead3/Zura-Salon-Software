

## Demo Bookings — Persist to DB, Isolate from Dashboard

**Problem**: Demo-mode bookings fake success without inserting into `phorest_appointments`, so they never appear on the Dock schedule.

**Solution**: Add an `is_demo` boolean column to `phorest_appointments`. In demo mode, insert real rows with `is_demo = true`. Filter them out from all non-Dock queries.

### 1. Database Migration

Add column:
```sql
ALTER TABLE public.phorest_appointments
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
```

### 2. `DockNewBookingSheet.tsx` — Replace demo no-op with real insert

Replace the fake `setTimeout` block (lines 245–248) with an actual `supabase.from('phorest_appointments').insert(...)` call that:
- Sets `is_demo: true`
- Uses `phorest_id: 'demo-' + crypto.randomUUID()`
- Populates client_name, service_name, appointment_date, start_time, end_time, location_id, stylist_user_id, status (`'pending'`), and notes from the form state
- Returns the inserted row's `id` so assistant assignments also work in demo mode

### 3. `useDockAppointments.ts` — No changes needed

The Dock query already fetches from `phorest_appointments` by location/date. Demo rows will surface automatically since they have valid location_id and appointment_date.

### 4. Exclude demo rows from dashboard queries

There are ~91 files querying `phorest_appointments`. The critical dashboard-facing ones need `.eq('is_demo', false)` added. These include:
- `src/hooks/usePhorestCalendar.ts` (main dashboard schedule)
- `src/lib/goal-metric-fetchers.ts` (KPI cards)
- `src/hooks/useServiceCostsProfits.ts` (sales analytics)
- `src/components/dashboard/sales/ServicePopularityChart.tsx`
- `src/hooks/useStylistExperienceScore.ts`
- `src/components/dashboard/clients/ClientRedoHistory.tsx`
- Edge functions: `detect-anomalies`, `process-client-automations`

Since `is_demo` defaults to `false`, existing rows are unaffected. Only demo-created rows will have `true`, so adding the filter is a safety net — but essential to prevent demo data from polluting analytics and the real schedule.

