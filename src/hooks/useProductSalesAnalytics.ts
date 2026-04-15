import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export type ProductTimeRange = 'week' | 'month' | '90days' | '365days';

export interface ProductSalesData {
  itemName: string;
  itemType: string;
  itemCategory: string | null;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
  transactionCount: number;
}

export interface StaffProductPerformance {
  phorestStaffId: string;
  userId: string | null;
  staffName: string;
  photoUrl: string | null;
  productRevenue: number;
  productQuantity: number;
  serviceRevenue: number;
  attachmentRate: number;
}

function getDateRange(timeRange: ProductTimeRange): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = format(today, 'yyyy-MM-dd');
  
  let startDate: string;
  switch (timeRange) {
    case 'week':
      startDate = format(subDays(today, 7), 'yyyy-MM-dd');
      break;
    case 'month':
      startDate = format(subDays(today, 30), 'yyyy-MM-dd');
      break;
    case '90days':
      startDate = format(subDays(today, 90), 'yyyy-MM-dd');
      break;
    case '365days':
      startDate = format(subDays(today, 365), 'yyyy-MM-dd');
      break;
    default:
      startDate = format(subDays(today, 30), 'yyyy-MM-dd');
  }
  
  return { startDate, endDate };
}

export function useProductSalesAnalytics(timeRange: ProductTimeRange = 'month', locationId?: string) {
  return useQuery({
    queryKey: ['product-sales-analytics', timeRange, locationId],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(timeRange);
      
      // Fetch from phorest_transaction_items table with pagination
      const items = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('*')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      
      // Aggregate by product/service name
      const productMap = new Map<string, ProductSalesData>();
      const staffProductMap = new Map<string, {
        productRevenue: number;
        productQuantity: number;
        serviceRevenue: number;
        serviceTransactions: Set<string>;
        productTransactions: Set<string>;
      }>();
      
      for (const item of items) {
        const key = `${item.item_name}-${item.item_type}`;
        
        if (!productMap.has(key)) {
          productMap.set(key, {
            itemName: item.item_name,
            itemType: item.item_type,
            itemCategory: item.item_category,
            totalQuantity: 0,
            totalRevenue: 0,
            averagePrice: 0,
            transactionCount: 0,
          });
        }
        
        const product = productMap.get(key)!;
        product.totalQuantity += item.quantity || 1;
        product.totalRevenue += Number(item.total_amount) || 0;
        product.transactionCount += 1;
        
        // Track staff performance
        if (item.phorest_staff_id) {
          if (!staffProductMap.has(item.phorest_staff_id)) {
            staffProductMap.set(item.phorest_staff_id, {
              productRevenue: 0,
              productQuantity: 0,
              serviceRevenue: 0,
              serviceTransactions: new Set(),
              productTransactions: new Set(),
            });
          }
          
          const staffData = staffProductMap.get(item.phorest_staff_id)!;
          if (item.item_type === 'product') {
            staffData.productRevenue += Number(item.total_amount) || 0;
            staffData.productQuantity += item.quantity || 1;
            staffData.productTransactions.add(item.transaction_id);
          } else {
            staffData.serviceRevenue += Number(item.total_amount) || 0;
            staffData.serviceTransactions.add(item.transaction_id);
          }
        }
      }
      
      // Calculate averages
      for (const product of productMap.values()) {
        product.averagePrice = product.transactionCount > 0 
          ? product.totalRevenue / product.transactionCount 
          : 0;
      }
      
      // Get staff profiles for names/photos
      const staffIds = Array.from(staffProductMap.keys());
      const { data: mappings } = await supabase
        .from('v_all_staff' as any)
        .select('phorest_staff_id, user_id, phorest_staff_name')
        .in('phorest_staff_id', staffIds);
      
      const userIds = mappings?.map(m => m.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const mappingMap = new Map(mappings?.map(m => [m.phorest_staff_id, m]) || []);
      
      // Build staff performance list
      const staffPerformance: StaffProductPerformance[] = [];
      for (const [staffId, data] of staffProductMap) {
        const mapping = mappingMap.get(staffId);
        const profile = mapping?.user_id ? profileMap.get(mapping.user_id) : null;
        
        const serviceTransactionIds = data.serviceTransactions;
        let transactionsWithProducts = 0;
        for (const txId of serviceTransactionIds) {
          if (data.productTransactions.has(txId)) {
            transactionsWithProducts++;
          }
        }
        const attachmentRate = serviceTransactionIds.size > 0 
          ? (transactionsWithProducts / serviceTransactionIds.size) * 100 
          : 0;
        
        staffPerformance.push({
          phorestStaffId: staffId,
          userId: mapping?.user_id || null,
          staffName: profile ? formatDisplayName(profile.full_name || '', profile.display_name) : (mapping?.phorest_staff_name || 'Unknown'),
          photoUrl: profile?.photo_url || null,
          productRevenue: data.productRevenue,
          productQuantity: data.productQuantity,
          serviceRevenue: data.serviceRevenue,
          attachmentRate,
        });
      }
      
      // Sort products by revenue
      const products = Array.from(productMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      // Sort staff by product revenue
      staffPerformance.sort((a, b) => b.productRevenue - a.productRevenue);
      
      // Calculate summary stats
      const totalProductRevenue = products
        .filter(p => p.itemType === 'product')
        .reduce((sum, p) => sum + p.totalRevenue, 0);
      
      const totalServiceRevenue = products
        .filter(p => p.itemType !== 'product')
        .reduce((sum, p) => sum + p.totalRevenue, 0);
      
      const topProducts = products.filter(p => p.itemType === 'product').slice(0, 10);
      const topServices = products.filter(p => p.itemType !== 'product').slice(0, 10);
      
      return {
        products,
        topProducts,
        topServices,
        staffPerformance,
        summary: {
          totalProductRevenue,
          totalServiceRevenue,
          totalRevenue: totalProductRevenue + totalServiceRevenue,
          productPercentage: totalProductRevenue + totalServiceRevenue > 0
            ? (totalProductRevenue / (totalProductRevenue + totalServiceRevenue)) * 100
            : 0,
          uniqueProducts: products.filter(p => p.itemType === 'product').length,
          uniqueServices: products.filter(p => p.itemType !== 'product').length,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
