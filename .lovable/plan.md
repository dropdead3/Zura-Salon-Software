

# Revised Plan: Merge Appointments & Transactions

The original plan is solid. Here are additional gaps and refinements discovered during this deeper pass:

## Additional Findings

### 1. `useProactiveIntelligence.ts` — hardcoded `/dashboard/transactions` in role route maps (Gap)
Lines 57, 64, 71, 121 reference `/dashboard/transactions` across multiple role configurations. These need updating to `/dashboard/appointments-hub` (since both surfaces now live there).

### 2. `synonymRegistry.ts` — `/dashboard/transactions` in `relatedPaths` (Gap)
Line 140 includes `/dashboard/transactions` in the appointments synonym group's `relatedPaths`. Should be removed (or replaced with the tab-qualified URL).

### 3. `ScheduleActionBar.tsx` — `dashPath('/transactions')` link (Gap)
Line 137 links to the transactions page from the schedule toolbar. Should update to `dashPath('/appointments-hub?tab=transactions')`.

### 4. Appointments route permission mismatch (Enhancement)
`appointments-hub` currently requires `view_transactions` permission (line 375 of App.tsx). After merging, this is correct since it now contains transactions — but the original appointments page likely should have been `view_booking_calendar`. Consider requiring *either* permission, or keeping `view_transactions` since that's the stricter gate and transactions are now embedded.

### 5. `pageExplainers.ts` — needs a combined entry (Minor)
Both `appointments-hub` and `transactions` likely have separate explainer entries. The merged page should have one combined explainer that covers both tabs.

### 6. Tab persistence via URL (Enhancement)
The plan mentions `?tab=` sync. Ensure that when navigating from an external link like `?tab=transactions`, the Transactions tab content initializes its own state (date, filters) fresh — no stale state from a previous Appointments tab interaction.

## Updated Change Table

| File | Change |
|------|--------|
| `src/pages/dashboard/AppointmentsHub.tsx` | Merge — add Tabs with Appointments + Transactions content |
| `src/pages/dashboard/Transactions.tsx` | Delete |
| `src/App.tsx` | Remove transactions route; add redirect to `appointments-hub?tab=transactions` |
| `src/config/dashboardNav.ts` | Merge entries → "Appointments & Transactions" |
| `src/lib/navKnowledgeBase.ts` | Merge entries |
| `src/lib/queryChainEngine.ts` | Update refund/refunds route |
| `src/lib/synonymRegistry.ts` | Remove `/dashboard/transactions` from relatedPaths |
| `src/hooks/useProactiveIntelligence.ts` | Replace `/dashboard/transactions` with `/dashboard/appointments-hub` in all role maps |
| `src/components/dashboard/schedule/ScheduleActionBar.tsx` | Update link to `appointments-hub?tab=transactions` |
| `src/config/pageExplainers.ts` | Combine explainer entries |

Everything else from the original plan remains unchanged. No structural or business logic changes — only the page shell, nav references, and cross-links are affected.

