import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface StaffTransactionRow {
  transactionDate: string;
  stylistName: string;
  clientName: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
}

export interface StaffTransactionSummary {
  rows: StaffTransactionRow[];
  totalRevenue: number;
  totalDiscount: number;
  totalItems: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  staffName?: string;
}

export function useStaffTransactionDetailReport(filters: Filters) {
  return useQuery({
    queryKey: ['staff-transaction-detail', filters],
    queryFn: async (): Promise<StaffTransactionSummary> => {
      const rows = await fetchAllBatched<{
        transaction_date: string;
        staff_name: string | null;
        client_name: string | null;
        item_name: string | null;
        item_type: string | null;
        quantity: number | null;
        unit_price: number | null;
        discount: number | null;
        total_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('transaction_date, staff_name, client_name, item_name, item_type, quantity, unit_price, discount, total_amount')
          .gte('transaction_date', filters.dateFrom)
          .lte('transaction_date', filters.dateTo)
          .order('transaction_date', { ascending: true })
          .range(from, to);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        if (filters.staffName) q = q.eq('staff_name', filters.staffName);
        return q;
      });

      let totalRevenue = 0;
      let totalDiscount = 0;

      const mapped: StaffTransactionRow[] = rows.map(r => {
        const amt = Number(r.total_amount) || 0;
        const disc = Math.abs(Number(r.discount) || 0);
        totalRevenue += amt;
        totalDiscount += disc;
        return {
          transactionDate: r.transaction_date,
          stylistName: r.staff_name || 'Unknown',
          clientName: r.client_name || 'Walk-in',
          itemName: r.item_name || 'Unknown',
          itemType: r.item_type || 'service',
          quantity: Number(r.quantity) || 1,
          unitPrice: Number(r.unit_price) || 0,
          discount: disc,
          totalAmount: amt,
        };
      });

      return { rows: mapped, totalRevenue, totalDiscount, totalItems: mapped.length };
    },
    staleTime: 2 * 60_000,
  });
}
