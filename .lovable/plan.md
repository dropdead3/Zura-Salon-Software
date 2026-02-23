
# Fix 1,000 Client Limit in Analytics

## Problem
The Operations > Clients analytics tab shows only 1,000 total clients because the `useOperationalAnalytics` hook fetches from the `phorest_clients` table without pagination. The default query limit caps results at 1,000 rows, so `data.length` returns 1,000 instead of the actual 3,000+ clients.

## Solution
Apply the same batch-pagination pattern (already used in the Client Directory) to the retention query inside `useOperationalAnalytics.ts`. This fetches all rows in batches of 1,000 using `.range()` until the full dataset is retrieved.

## File Change: `src/hooks/useOperationalAnalytics.ts`

### Retention query (lines ~202-251)

Replace the single query call with a paginated fetch loop:

```text
Current (capped at 1,000):
  const { data, error } = await query;

Replacement (fetches all rows in batches):
  const allData = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let batchQuery = supabase
      .from('phorest_clients')
      .select('id, name, email, phone, visit_count, last_visit, total_spend, created_at')
      .range(from, from + batchSize - 1);

    if (locationId) {
      batchQuery = batchQuery.eq('location_id', locationId);
    }

    const { data, error } = await batchQuery;
    if (error) throw error;
    if (data && data.length > 0) {
      allData.push(...data);
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
```

Then use `allData` instead of `data` for computing `totalClients`, `returningClients`, `newClients`, and `atRiskClients`.

### Additional: Volume, Heatmap, and Status queries

These three queries also fetch from `phorest_appointments` without pagination. While they may not yet hit 1,000 rows for a single date range, they will as the organization scales. The same batch pattern will be applied to all three queries for consistency and future-proofing.

## No database changes required
This is purely a frontend hook fix -- no schema or RLS modifications needed.
