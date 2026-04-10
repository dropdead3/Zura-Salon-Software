

# Separate Appointments and Transactions into Dedicated Routes

## Overview

Split the current `AppointmentsHub` (3-tab page) into two standalone pages:
- **Appointments** page at `/dashboard/appointments` — appointments list only
- **Transactions** page at `/dashboard/transactions` — transactions + gift cards

Update the sidebar nav link to point to the new dedicated route. Remove the old tabbed hub.

## Changes

### 1. Create `/dashboard/transactions` page

New file `src/pages/dashboard/Transactions.tsx`:
- Extract `TransactionsTab` and `GiftCardManager` from `AppointmentsHub.tsx`
- Two tabs: Transactions, Gift Cards
- Page header: "Sales" with description focused on financial records
- Keep the analytics quick-links callout
- Permission: `view_transactions`

### 2. Simplify `AppointmentsHub` → Appointments-only page

Rename to `src/pages/dashboard/Appointments.tsx`:
- Remove Transactions and Gift Cards tabs entirely
- Remove all transaction-related imports
- Single-page appointments list (no tabs needed)
- Page header: "Appointments"
- Permission: `view_booking_calendar` (or keep `view_transactions`)

### 3. Update routes in `App.tsx`

- Add route: `transactions` → new Transactions page (permission: `view_transactions`)
- Change `appointments-hub` route to render the simplified Appointments page
- Keep redirect: `transactions` (legacy) → new `/dashboard/transactions`
- Add redirect: `appointments-hub?tab=transactions` → `/dashboard/transactions`

### 4. Update sidebar nav in `dashboardNav.ts`

- Change Transactions href from `/dashboard/appointments-hub?tab=transactions` to `/dashboard/transactions`
- Update search items array entry

### 5. Update cross-references (~10 files)

Files referencing `appointments-hub?tab=transactions` or `appointments-hub`:
- `queryChainEngine.ts` — update route mappings
- `navKnowledgeBase.ts` — split into two entries
- `synonymRegistry.ts` — add transactions path
- `ClientDetailSheet.tsx` — update appointments link (remove `?tab=appointments`)
- `ScheduleActionBar.tsx` — update link
- `useProactiveIntelligence.ts` — add `/dashboard/transactions` to relevant role paths
- `pageExplainers.ts` — add transactions explainer, update appointments one

### 6. Localization

Already have `transactions` key in `en.json`. No changes needed.

## Files

| File | Action |
|------|--------|
| `src/pages/dashboard/Transactions.tsx` | Create — extracted transactions + gift cards |
| `src/pages/dashboard/AppointmentsHub.tsx` | Simplify — appointments only, remove tabs |
| `src/App.tsx` | Add transactions route, update appointments-hub |
| `src/config/dashboardNav.ts` | Update href + search items |
| `src/lib/queryChainEngine.ts` | Update route mappings |
| `src/lib/navKnowledgeBase.ts` | Split entry |
| `src/lib/synonymRegistry.ts` | Add transactions path |
| `src/components/dashboard/ClientDetailSheet.tsx` | Update link |
| `src/components/dashboard/schedule/ScheduleActionBar.tsx` | Update link |
| `src/hooks/useProactiveIntelligence.ts` | Add path |
| `src/config/pageExplainers.ts` | Add transactions explainer |

