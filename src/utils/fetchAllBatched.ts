/**
 * fetchAllBatched — Generic paginated Supabase query helper.
 *
 * Fetches all rows matching a query by paginating in batches of `batchSize`.
 * Prevents the default 1000-row Supabase limit from silently truncating results.
 *
 * Two signatures supported:
 *
 * 1. Builder pattern (most common):
 *   const rows = await fetchAllBatched<MyType>(
 *     (from, to) => supabase
 *       .from('phorest_appointments')
 *       .select('id, total_price')
 *       .eq('status', 'completed')
 *       .range(from, to),
 *     1000
 *   );
 *
 * 2. Pre-built query (for simple cases — adds .range() automatically):
 *   const rows = await fetchAllBatched<MyType>(query);
 */

const DEFAULT_BATCH_SIZE = 1000;

export async function fetchAllBatched<T = any>(
  queryOrBuilder: ((from: number, to: number) => any) | { range: (from: number, to: number) => any },
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  // Detect if it's a builder function or a pre-built query object
  const isBuilder = typeof queryOrBuilder === 'function';

  while (hasMore) {
    const to = from + batchSize - 1;
    const { data, error } = isBuilder
      ? await (queryOrBuilder as (from: number, to: number) => any)(from, to)
      : await (queryOrBuilder as any).range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allRows.push(...data);
      hasMore = data.length === batchSize;
      from += batchSize;
    } else {
      hasMore = false;
    }
  }

  return allRows;
}
