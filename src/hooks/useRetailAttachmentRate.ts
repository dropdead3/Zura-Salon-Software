import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isExtensionProduct, isVishServiceCharge } from '@/utils/serviceCategorization';

export interface RetailAttachmentData {
  /** Total distinct client-visit combos that included at least one service */
  serviceTransactions: number;
  /** Distinct client-visits that also included a retail product */
  attachedTransactions: number;
  /** attachedTransactions / serviceTransactions × 100 */
  attachmentRate: number;
}

interface UseRetailAttachmentRateOptions {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

const PAGE_SIZE = 1000;

async function fetchAllPages(
  buildQuery: (offset: number) => any
): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await buildQuery(offset);
    if (error) throw error;
    all.push(...(data || []));
    hasMore = (data?.length || 0) === PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  return all;
}

export function useRetailAttachmentRate({ dateFrom, dateTo, locationId }: UseRetailAttachmentRateOptions) {
  return useQuery({
    queryKey: ['retail-attachment-rate', dateFrom, dateTo, locationId || 'all'],
    queryFn: async (): Promise<RetailAttachmentData> => {
      const buildLocationFilter = (q: any) => {
        if (locationId && locationId !== 'all') {
          const ids = locationId.split(',').filter(Boolean);
          if (ids.length === 1) return q.eq('location_id', ids[0]);
          if (ids.length > 1) return q.in('location_id', ids);
        }
        return q;
      };

      const serviceItems = await fetchAllPages((offset) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('phorest_client_id, transaction_date')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .not('phorest_client_id', 'is', null)
          .in('item_type', ['Service', 'service', 'SERVICE'])
          .range(offset, offset + PAGE_SIZE - 1);
        return buildLocationFilter(q);
      });

      const productItems = await fetchAllPages((offset) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('phorest_client_id, transaction_date, item_name')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .not('phorest_client_id', 'is', null)
          .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
          .range(offset, offset + PAGE_SIZE - 1);
        return buildLocationFilter(q);
      });

      // Build composite visit keys: clientId|date
      const serviceVisitSet = new Set<string>();
      for (const row of serviceItems) {
        if (row.phorest_client_id && row.transaction_date) {
          serviceVisitSet.add(`${row.phorest_client_id}|${row.transaction_date}`);
        }
      }

      // Filter out extension products and Vish chemical charges — not cross-sells
      const nonExtensionProducts = productItems.filter(
        (row: any) => !isExtensionProduct(row.item_name) && !isVishServiceCharge(row.item_name, 'product')
      );

      const productVisitSet = new Set<string>();
      for (const row of nonExtensionProducts) {
        if (row.phorest_client_id && row.transaction_date) {
          productVisitSet.add(`${row.phorest_client_id}|${row.transaction_date}`);
        }
      }

      const serviceTransactions = serviceVisitSet.size;
      let attachedTransactions = 0;
      serviceVisitSet.forEach(key => {
        if (productVisitSet.has(key)) attachedTransactions++;
      });

      const attachmentRate = serviceTransactions > 0
        ? Math.round((attachedTransactions / serviceTransactions) * 100)
        : 0;

      return { serviceTransactions, attachedTransactions, attachmentRate };
    },
    staleTime: 5 * 60 * 1000,
  });
}
