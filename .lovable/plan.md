

# Phase 1 & 2 Bug Fixes + Phase 3 (Gift Cards & Vouchers)

## Bugs Found in Phase 1 & 2

### Bug 1: Client Birthdays not sorted
`useClientBirthdaysReport.ts` returns results unsorted. Should sort by `daysUntil` ascending (soonest first).

### Bug 2: Client Source report ignores date range
`useClientSourceReport` (inline in `ClientSourceReport.tsx`) accepts `dateFrom`/`dateTo` props but never uses them — it queries all clients regardless of when they were created. Should filter by `created_at` within the date range for meaningful period analysis.

### Bug 3: Client Source CSV filename hardcoded
Line 95: `a.download = 'client-source.csv'` — doesn't use `buildReportFileName` like every other report.

### Bug 4: Duplicate Clients CSV filename hardcoded
Line 61: `a.download = 'duplicate-clients.csv'` — same issue.

### Bug 5: Client Birthdays CSV filename hardcoded
Line 50: `a.download = 'client-birthdays.csv'` — same issue.

### Bug 6: FutureAppointmentsReport ignores `dateFrom`
The hook (line 41) uses `today` as the start but ignores `dateFrom`. This is arguably correct behavior (future = from today), but the `dateFrom` prop is accepted and silently discarded. Should document or use it.

### Bug 7: TopClientsReport has inline hook
The `useTopClientsReport` hook is defined inline in the component file rather than in `/hooks/`. Not a bug per se, but inconsistent with all other reports.

**All are minor. 5 file touches.**

---

## Phase 3: Gift Card & Voucher Reports

Data tables `gift_cards`, `vouchers`, and `gift_card_orders` already exist with full schema. No migrations needed.

### 3 New Reports

| Report | Data Source | What It Shows |
|---|---|---|
| **Gift Cards Report** | `gift_cards` table | Cards sold, active balance outstanding, expired cards, redemption rate |
| **Vouchers Report** | `vouchers` table | Vouchers issued, redeemed, outstanding, value by type |
| **Gift Card Orders** | `gift_card_orders` table | Physical card orders, status, shipping |

### Implementation

**New files:**
- `src/hooks/useGiftCardsReport.ts` — query `gift_cards`, aggregate by status (active/expired/redeemed)
- `src/hooks/useVouchersReport.ts` — query `vouchers`, aggregate by redemption status
- `src/components/dashboard/reports/GiftCardsReport.tsx` — KPI tiles (total issued, outstanding balance, expired) + table
- `src/components/dashboard/reports/VouchersReport.tsx` — KPI tiles (issued, redeemed, outstanding value) + table

**Edited:**
- `ReportsTabContent.tsx` — add new "Gift Cards" category or add to Sales, plus switch cases

**Consolidation:** Rather than Phorest's 4 separate gift card reports (Sold/Redeemed/Outstanding/Totals), we consolidate into 2 comprehensive reports — one for gift cards, one for vouchers — each showing all lifecycle states in one view.

### Pattern
All new reports follow the established pattern: `BlurredAmount` wrapping, `buildCsvString` for CSV, `buildReportFileName` for filenames, branded PDF via `jsPDF`/`autoTable`, back button inside `CardHeader`.

---

## Summary

| Category | Action | Files |
|---|---|---|
| Bug fixes (Phase 1/2) | Sort birthdays, fix 3 hardcoded filenames, add date filter to Client Source | 3 files |
| Phase 3 | Gift Cards Report + Vouchers Report | 4 new + 1 edited |
| **Total** | | 8 file touches |

