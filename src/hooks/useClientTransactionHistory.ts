import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { resolveStaffNamesByPhorestIds } from '@/utils/resolveStaffNames';

export interface ClientTransaction {
  transactionId: string;
  transactionDate: string;
  itemType: string;
  itemName: string;
  itemCategory: string | null;
  quantity: number;
  totalAmount: number;
  staffName: string | null;
  staffId: string | null;
  branchName: string | null;
}

export interface ClientTransactionSummary {
  totalSpend: number;
  serviceSpend: number;
  productSpend: number;
  visitCount: number;
  averageTicket: number;
  preferredStaffId: string | null;
  preferredStaffName: string | null;
  firstVisit: string | null;
  lastVisit: string | null;
}

export function useClientTransactionHistory(clientId: string | null) {
  return useQuery({
    queryKey: ['client-transaction-history', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      // Fetch from v_all_transaction_items (supports both Phorest and Zura-native data)
      const { data: items, error } = await supabase
        .from('v_all_transaction_items')
        .select('*')
        .eq('phorest_client_id', clientId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      
      if (!items || items.length === 0) {
        return {
          transactions: [],
          summary: {
            totalSpend: 0,
            serviceSpend: 0,
            productSpend: 0,
            visitCount: 0,
            averageTicket: 0,
            preferredStaffId: null,
            preferredStaffName: null,
            firstVisit: null,
            lastVisit: null,
          },
          spendByMonth: [],
        };
      }
      
      // Get staff names via centralized resolver (handles both phorest_staff_id and user_id)
      const staffIds = [...new Set(items.map(i => i.staff_user_id).filter(Boolean))];
      const staffNameMap = await resolveStaffNamesByPhorestIds(staffIds as string[]);
      
      // Build transactions list
      const transactions: ClientTransaction[] = items.map(item => ({
        transactionId: item.transaction_id,
        transactionDate: item.transaction_date,
        itemType: item.item_type,
        itemName: item.item_name,
        itemCategory: item.item_category,
        quantity: item.quantity || 1,
        totalAmount: Number(item.total_amount) || 0,
        staffName: item.staff_user_id ? staffNameMap[item.staff_user_id] || null : null,
        staffId: item.staff_user_id,
        branchName: item.branch_name,
      }));
      
      // Calculate summary stats
      let totalSpend = 0;
      let serviceSpend = 0;
      let productSpend = 0;
      const staffVisitCount = new Map<string, number>();
      const visitDates = new Set<string>();
      
      for (const item of items) {
        const amount = Number(item.total_amount) || 0;
        totalSpend += amount;
        
        if (item.item_type === 'product') {
          productSpend += amount;
        } else {
          serviceSpend += amount;
        }
        
        visitDates.add(item.transaction_date);
        
        if (item.staff_user_id) {
          staffVisitCount.set(
            item.staff_user_id, 
            (staffVisitCount.get(item.staff_user_id) || 0) + 1
          );
        }
      }
      
      // Find preferred stylist (most visits)
      let preferredStaffId: string | null = null;
      let maxVisits = 0;
      for (const [staffId, count] of staffVisitCount) {
        if (count > maxVisits) {
          maxVisits = count;
          preferredStaffId = staffId;
        }
      }
      
      const visitCount = visitDates.size;
      const sortedDates = Array.from(visitDates).sort();
      
      // Calculate spend by month
      const spendByMonth = new Map<string, { services: number; products: number }>();
      for (const item of items) {
        const monthKey = item.transaction_date.substring(0, 7); // YYYY-MM
        if (!spendByMonth.has(monthKey)) {
          spendByMonth.set(monthKey, { services: 0, products: 0 });
        }
        const monthData = spendByMonth.get(monthKey)!;
        const amount = Number(item.total_amount) || 0;
        if (item.item_type === 'product') {
          monthData.products += amount;
        } else {
          monthData.services += amount;
        }
      }
      
      const spendByMonthArray = Array.from(spendByMonth.entries())
        .map(([month, data]) => ({
          month,
          services: data.services,
          products: data.products,
          total: data.services + data.products,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
      
      const summary: ClientTransactionSummary = {
        totalSpend,
        serviceSpend,
        productSpend,
        visitCount,
        averageTicket: visitCount > 0 ? totalSpend / visitCount : 0,
        preferredStaffId,
        preferredStaffName: preferredStaffId ? staffNameMap[preferredStaffId] || null : null,
        firstVisit: sortedDates[0] || null,
        lastVisit: sortedDates[sortedDates.length - 1] || null,
      };
      
      return {
        transactions,
        summary,
        spendByMonth: spendByMonthArray,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
