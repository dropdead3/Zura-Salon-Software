

## Analysis: Tables and Lists Missing Pagination and Sorting

I reviewed all 165 files containing table components and cross-referenced against the 3 pages that already have pagination (ClientDirectory, AuditLog, and GroupedTransactionTable which has sorting only). Here are the areas that need attention, ranked by impact.

---

### High Priority (data grows with daily operations)

| Surface | File | Has Pagination | Has Sorting | Data Growth |
|---|---|---|---|---|
| **Waitlist Table** | `WaitlistTable.tsx` | No | No | Grows daily |
| **Commission Statements** | `RenterCommissions.tsx` | No | No | Grows per pay period |
| **Payment Ops — Fee Charges** | `PaymentOps.tsx` | No | No | Grows per transaction |
| **Payment Ops — Disputes** | `PaymentOps.tsx` | No | No | Grows over time |
| **Payment Ops — Holds** | `PaymentOps.tsx` | No | No | Grows over time |
| **Gift Card Order History** | `PhysicalCardOrderHistory.tsx` | No | No | Grows per order |
| **Feedback Responses** | `FeedbackResponseList.tsx` | No (ScrollArea) | No | Grows per survey response |

### Medium Priority (data grows but more slowly)

| Surface | File | Has Pagination | Has Sorting | Notes |
|---|---|---|---|---|
| **PTO Balances** | `PTOManager.tsx` | No | No | Grows per team member |
| **Team Progress** | `TeamProgressDashboard.tsx` | No | No | Grows per team member |
| **Team PIN Changelog** | `TeamPinManagementTab.tsx` | No (`.slice(0,10)`) | No | Hard-capped at 10 rows, should paginate |
| **Leaderboard History** | `LeaderboardHistoryPanel.tsx` | No | No | Grows weekly per user |

### Lower Priority (bounded datasets)

| Surface | File | Notes |
|---|---|---|
| **Commission Roster** | `TeamCommissionRoster.tsx` | Bounded by team size, sorting exists |
| **Changelog entries** | `Changelog.tsx` | Has filtering, list is curated |

---

### Recommended Implementation Approach

1. **Create a reusable `usePaginatedSort` hook** that encapsulates:
   - `currentPage`, `pageSize`, `sortField`, `sortDirection`
   - `paginatedData` computed from source array
   - `totalPages`, `showingRange` helpers

2. **Create a `<TablePagination />` wrapper component** that standardizes the pagination UI (count label + Pagination controls) so every table looks consistent.

3. **Add sortable column headers** using the existing `ArrowUpDown` pattern from `GroupedTransactionTable` as the canonical reference.

4. **Apply to tables in priority order:**
   - Waitlist: sort by priority, date, status; paginate at 25 rows
   - PaymentOps tabs: sort by date, amount, status; paginate at 25 rows
   - Commission Statements: sort by period, amount, status; paginate at 20 rows
   - Feedback Responses: sort by date, rating, NPS; paginate at 20 rows
   - Gift Card Orders: sort by date, quantity, total, status; paginate at 20 rows
   - PTO / Team tables: sort by name, balance; paginate at 25 rows

### Technical Details

- The reusable hook avoids duplicating pagination/sort state across 10+ components
- Default page sizes follow existing patterns (ClientDirectory uses `PAGE_SIZE` constant)
- Sorting uses the same `ArrowUpDown` icon pattern already established in `GroupedTransactionTable`
- All pagination uses the existing `Pagination` component from `src/components/ui/pagination.tsx`

---

This is a significant effort spanning 8-10 component files plus 2 new shared utilities. I'd recommend tackling it in batches — shall I start with the shared hook + the highest-priority tables (Waitlist, PaymentOps, Commission Statements)?

