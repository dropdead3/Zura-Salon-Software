

# Platform Admin Refund History Sub-Tab

## Overview

Add a **Refund History** tab to the Backroom Admin page that queries `refund_records` across all organizations, with filters for date range, amount range, org, status, and refund type. No new tables or migrations needed — all data exists in `refund_records`.

## Changes

### 1. New Component: `RefundHistoryTab.tsx`

A platform-scoped refund viewer with:
- **KPI row**: Total refunds processed, total amount, pending count, avg refund amount
- **Filter bar**: Date range (start/end), min/max amount, org name search, status dropdown, refund type dropdown
- **Results table**: Org name, item name, refund amount, type, status, reason, date processed — sorted by `created_at` desc
- Query uses platform admin access (no org scoping) to `refund_records` joined with `organizations` for org name display

### 2. Modify: `BackroomAdmin.tsx`

Add an 8th tab "Refund History" with `ReceiptText` icon after Coach Performance.

### 3. New Hook: `usePlatformRefundHistory.ts`

Platform-scoped query hook that:
- Fetches from `refund_records` with `select('*, organizations(name)')` 
- Accepts filter params (dateFrom, dateTo, minAmount, maxAmount, orgSearch, status, refundType)
- Applies filters via Supabase query builder (`.gte`, `.lte`, `.eq`, `.ilike` on joined org name)
- Returns paginated results with summary stats computed client-side

## Files

| File | Action |
|------|--------|
| `src/hooks/platform/usePlatformRefundHistory.ts` | New — cross-org refund query with filters |
| `src/components/platform/backroom/RefundHistoryTab.tsx` | New — KPI cards + filter bar + table |
| `src/pages/dashboard/platform/BackroomAdmin.tsx` | Add tab trigger + content |

## Technical Notes

- No new database tables or RLS changes — platform users already have access to `refund_records` via `is_platform_user` RLS
- Reuses existing platform UI primitives (`PlatformCard`, `PlatformBadge`, `PlatformButton`, `PlatformInput`)
- Uses `useFormatCurrency` for monetary display and `useFormatDate` for date formatting
- Client-side pagination with a default page size of 25

