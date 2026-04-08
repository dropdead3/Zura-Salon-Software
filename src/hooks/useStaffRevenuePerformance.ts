import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfMonth, format } from 'date-fns';
import { usePerformanceThreshold } from './usePerformanceThreshold';
import { resolveStaffNames } from '@/utils/resolveStaffNames';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export type RevenueTimeRange = 'today' | 'week' | 'month' | '90days' | '6months' | '365days';

export interface StaffRevenueData {
  userId: string | null;
  phorestStaffId: string;
  name: string;
  displayName: string | null;
  photoUrl: string | null;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  transactionCount: number;
  averageTicket: number;
  daysWithData: number;
  isBelowThreshold: boolean;
}

function getDateRange(timeRange: RevenueTimeRange): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = format(today, 'yyyy-MM-dd');
  
  let startDate: string;
  
  switch (timeRange) {
    case 'today':
      startDate = endDate;
      break;
    case 'week':
      startDate = format(subDays(today, 7), 'yyyy-MM-dd');
      break;
    case 'month':
      startDate = format(startOfMonth(today), 'yyyy-MM-dd');
      break;
    case '90days':
      startDate = format(subDays(today, 90), 'yyyy-MM-dd');
      break;
    case '6months':
      startDate = format(subDays(today, 180), 'yyyy-MM-dd');
      break;
    case '365days':
      startDate = format(subDays(today, 365), 'yyyy-MM-dd');
      break;
    default:
      startDate = format(subDays(today, 30), 'yyyy-MM-dd');
  }
  
  return { startDate, endDate };
}

export function useStaffRevenuePerformance(
  timeRange: RevenueTimeRange = 'month',
  locationId?: string
) {
  const { data: threshold } = usePerformanceThreshold();
  
  return useQuery({
    queryKey: ['staff-revenue-performance', timeRange, locationId, threshold],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(timeRange);
      
      // Query raw transactions (POS-first integrity model)
      const txData = await fetchAllBatched<{
        phorest_staff_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        transaction_date: string | null;
        location_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_sales_transactions')
          .select('phorest_staff_id, total_amount, tax_amount, transaction_date, location_id')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .not('phorest_staff_id', 'is', null)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Also fetch transaction items for service/product breakdown
      const itemData = await fetchAllBatched<{
        phorest_staff_id: string | null;
        item_type: string | null;
        total_amount: number | null;
        transaction_date: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('phorest_staff_id, item_type, total_amount, tax_amount, transaction_date')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .not('phorest_staff_id', 'is', null)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      
      // Get staff mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('phorest_staff_mapping')
        .select('user_id, phorest_staff_id, phorest_staff_name');
      if (mappingsError) throw mappingsError;

      // Resolve names via centralized utility
      const phorestIds = (mappings || []).map(m => m.phorest_staff_id);
      const staffNameData = await resolveStaffNames(phorestIds);

      // Fetch photos from employee_profiles
      const userIds = (mappings || []).filter(m => m.user_id).map(m => m.user_id!);
      const { data: profiles, error: profilesError } = userIds.length > 0
        ? await supabase.from('employee_profiles').select('user_id, full_name, display_name, photo_url').eq('is_active', true).in('user_id', userIds)
        : { data: [] as any[], error: null };
      if (profilesError) throw profilesError;

      // Create lookup maps
      const mappingByPhorestId = new Map(
        (mappings || []).map(m => [m.phorest_staff_id, m])
      );
      const profileByUserId = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );
      
      // Aggregate transactions by phorest_staff_id
      const aggregatedData = new Map<string, {
        totalRevenue: number;
        serviceRevenue: number;
        productRevenue: number;
        transactionCount: number;
        daysWithData: Set<string>;
      }>();
      
      // Sum revenue from raw transactions (total_amount + tax_amount per POS-first standard)
      for (const tx of txData) {
        const staffId = tx.phorest_staff_id;
        if (!staffId) continue;
        
        const existing = aggregatedData.get(staffId) || {
          totalRevenue: 0,
          serviceRevenue: 0,
          productRevenue: 0,
          transactionCount: 0,
          daysWithData: new Set<string>(),
        };
        
        existing.totalRevenue += (Number(tx.total_amount) || 0) + (Number(tx.tax_amount) || 0);
        existing.transactionCount += 1;
        if (tx.transaction_date) existing.daysWithData.add(tx.transaction_date);
        
        aggregatedData.set(staffId, existing);
      }

      // Enrich with service/product breakdown from transaction items
      for (const item of itemData) {
        const staffId = item.phorest_staff_id;
        if (!staffId) continue;
        const existing = aggregatedData.get(staffId);
        if (!existing) continue;

        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') {
          existing.serviceRevenue += amount;
        } else if (itemType === 'product') {
          existing.productRevenue += amount;
        }
      }
      
      // Build final staff list
      const staffList: StaffRevenueData[] = [];
      
      for (const [phorestStaffId, data] of aggregatedData) {
        const mapping = mappingByPhorestId.get(phorestStaffId);
        const profile = mapping?.user_id ? profileByUserId.get(mapping.user_id) : null;
        
        const daysWithData = data.daysWithData.size;
        const averageTicket = data.transactionCount > 0 
          ? data.totalRevenue / data.transactionCount 
          : 0;
        
        // Calculate if below threshold (prorate based on actual days with data)
        let isBelowThreshold = false;
        if (threshold?.alertsEnabled && threshold.minimumRevenue > 0) {
          const evaluationDays = threshold.evaluationPeriodDays || 30;
          const proratedThreshold = threshold.minimumRevenue * (daysWithData / evaluationDays);
          isBelowThreshold = data.totalRevenue < proratedThreshold && daysWithData >= 7; // Only flag if 7+ days of data
        }
        
        staffList.push({
          userId: mapping?.user_id || null,
          phorestStaffId,
          name: staffNameData.byPhorestId[phorestStaffId] || mapping?.phorest_staff_name || 'Unknown Staff',
          displayName: profile?.display_name || null,
          photoUrl: (profile as any)?.photo_url || null,
          totalRevenue: data.totalRevenue,
          serviceRevenue: data.serviceRevenue,
          productRevenue: data.productRevenue,
          transactionCount: data.transactionCount,
          averageTicket,
          daysWithData,
          isBelowThreshold,
        });
      }
      
      // Sort by total revenue descending
      staffList.sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      // Calculate summary stats
      const totalRevenue = staffList.reduce((sum, s) => sum + s.totalRevenue, 0);
      const avgPerStaff = staffList.length > 0 ? totalRevenue / staffList.length : 0;
      const topPerformer = staffList[0] || null;
      const belowThresholdCount = staffList.filter(s => s.isBelowThreshold).length;
      
      return {
        staff: staffList,
        summary: {
          totalRevenue,
          avgPerStaff,
          topPerformer,
          belowThresholdCount,
          staffCount: staffList.length,
        },
      };
    },
    enabled: !!threshold,
  });
}
