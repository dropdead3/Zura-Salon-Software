

# Fix: Daily Sales Summary — Add Day-by-Day Line Items

## Problem
The Daily Sales Summary report shows only 4 aggregated KPI tiles (Total Revenue, Service Revenue, Total Services, Average Ticket) with no daily breakdown. A "Daily Sales Summary" should display one row per day showing that day's revenue, service/product split, transaction count, and average ticket.

The data hook (`useDailySalesSummary`) already exists and aggregates transaction items by date — but `SalesReportGenerator` never calls it and never renders a daily table.

## Fix Plan

### File: `src/components/dashboard/reports/SalesReportGenerator.tsx`

1. **Import and call `useDailySalesSummary`** with the same date/location filters
2. **Aggregate the per-staff daily rows into per-date rows** (the hook returns rows keyed by date + staff; we need one row per date)
3. **Render a day-by-day table** below the KPI tiles when `reportType === 'daily-sales'`:
   - Columns: Date, Total Revenue, Service Revenue, Product Revenue, Services, Products, Avg Ticket
   - Sorted by date ascending (chronological)
4. **Add the daily table to PDF generation** — `autoTable` with the same columns after the Summary section
5. **Add the daily table to CSV export** — currently the CSV export has no `daily-sales` case and exports an empty file
6. **Add the daily table to the Preview modal** — same table rendered inside `ReportPreviewModal`

### Data Aggregation Logic
```text
Input:  useDailySalesSummary rows (keyed by date + staff_id)
Output: one row per date

Group by summary_date →
  sum total_revenue, service_revenue, product_revenue, total_services, total_products
  compute avg_ticket = total_revenue / (total_services + total_products)
Sort ascending by date
```

### Visual Output (matches screenshot intent)
```text
| Date       | Total Revenue | Service Rev | Product Rev | Services | Products | Avg Ticket |
|------------|---------------|-------------|-------------|----------|----------|------------|
| Mar 31     | $2,450.00     | $2,100.00   | $350.00     | 12       | 4        | $153.13    |
| Apr 1      | $3,120.00     | $2,800.00   | $320.00     | 15       | 3        | $173.33    |
| ...        |               |             |             |          |          |            |
```

KPI tiles remain at the top as period-level summary. The table provides the daily drill-down.

### Files Modified
| File | Change |
|---|---|
| `SalesReportGenerator.tsx` | Add `useDailySalesSummary` call, render daily table in UI/PDF/CSV/Preview |

1 file edit. No migrations. No new files.

