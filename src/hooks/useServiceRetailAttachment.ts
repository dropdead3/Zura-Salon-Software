import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory, isExtensionProduct, isVishServiceCharge } from '@/utils/serviceCategorization';

export interface ServiceRetailRow {
  serviceName: string;
  serviceCategory: string | null;
  totalTransactions: number;
  attachedTransactions: number;
  attachmentRate: number;
  retailRevenue: number;
  avgRetailPerAttached: number;
}

interface UseServiceRetailAttachmentOptions {
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

export function useServiceRetailAttachment({ dateFrom, dateTo, locationId }: UseServiceRetailAttachmentOptions) {
  return useQuery({
    queryKey: ['service-retail-attachment', dateFrom, dateTo, locationId || 'all'],
    queryFn: async (): Promise<ServiceRetailRow[]> => {
      const buildLocationFilter = (q: any) => {
        if (locationId && locationId !== 'all') return q.eq('location_id', locationId);
        return q;
      };

      // 1. Fetch all service items in date range
      const serviceItems = await fetchAllPages((offset) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('phorest_client_id, transaction_date, item_name, item_category')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .not('phorest_client_id', 'is', null)
          .in('item_type', ['Service', 'service', 'SERVICE'])
          .range(offset, offset + PAGE_SIZE - 1);
        return buildLocationFilter(q);
      });

      // 2. Fetch all product items in date range
      const productItems = await fetchAllPages((offset) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('phorest_client_id, transaction_date, total_amount, item_name')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .not('phorest_client_id', 'is', null)
          .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
          .range(offset, offset + PAGE_SIZE - 1);
        return buildLocationFilter(q);
      });

      // 3. Build product visit map: visitKey -> total retail $
      const productVisitMap = new Map<string, number>();
      for (const p of productItems) {
        if (!p.phorest_client_id || !p.transaction_date) continue;
        if (isExtensionProduct(p.item_name)) continue;
        if (isVishServiceCharge(p.item_name, 'product')) continue;
        const key = `${p.phorest_client_id}|${p.transaction_date}`;
        productVisitMap.set(
          key,
          (productVisitMap.get(key) || 0) + (Number(p.total_amount) || 0)
        );
      }

      // 4. Group services by item_name, collecting visit keys
      const serviceMap = new Map<string, {
        category: string | null;
        visitKeys: Set<string>;
      }>();

      for (const s of serviceItems) {
        if (!s.phorest_client_id || !s.transaction_date || !s.item_name) continue;
        const visitKey = `${s.phorest_client_id}|${s.transaction_date}`;
        const name = s.item_name;
        let entry = serviceMap.get(name);
        if (!entry) {
          entry = {
            category: s.item_category || getServiceCategory(s.item_name),
            visitKeys: new Set(),
          };
          serviceMap.set(name, entry);
        }
        entry.visitKeys.add(visitKey);
      }

      // 5. Calculate attachment metrics per service
      const rows: ServiceRetailRow[] = [];
      for (const [serviceName, { category, visitKeys }] of serviceMap) {
        const totalTransactions = visitKeys.size;
        let attachedTransactions = 0;
        let retailRevenue = 0;

        visitKeys.forEach(key => {
          const retailAmount = productVisitMap.get(key);
          if (retailAmount !== undefined && retailAmount > 0) {
            attachedTransactions++;
            retailRevenue += retailAmount;
          }
        });

        const attachmentRate = totalTransactions > 0
          ? Math.round((attachedTransactions / totalTransactions) * 100)
          : 0;
        const avgRetailPerAttached = attachedTransactions > 0
          ? retailRevenue / attachedTransactions
          : 0;

        rows.push({
          serviceName,
          serviceCategory: category,
          totalTransactions,
          attachedTransactions,
          attachmentRate,
          retailRevenue,
          avgRetailPerAttached,
        });
      }

      // Sort by retail revenue descending
      rows.sort((a, b) => b.retailRevenue - a.retailRevenue);
      return rows;
    },
    staleTime: 5 * 60 * 1000,
  });
}
