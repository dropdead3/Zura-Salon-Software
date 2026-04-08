/**
 * fetchAllBatched — Generic paginated Supabase query helper.
 *
 * Fetches all rows matching a query by paginating in batches of `pageSize`.
 * Prevents the default 1000-row Supabase limit from silently truncating results.
 *
 * Usage:
 *   const rows = await fetchAllBatched(
 *     () => supabase
 *       .from('phorest_appointments')
 *       .select('id, total_price')
 *       .eq('status', 'completed'),
 *     1000
 *   );
 */

import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

const DEFAULT_PAGE_SIZE = 1000;

export async function fetchAllBatched<T = any>(
  queryBuilder: () => PostgrestFilterBuilder<any, any, any>,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder().range(offset, offset + pageSize - 1);
    if (error) throw error;
    allRows.push(...(data || []));
    hasMore = (data?.length || 0) === pageSize;
    offset += pageSize;
  }

  return allRows;
}
