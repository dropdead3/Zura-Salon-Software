import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';
import { resolveStaffNames } from '@/utils/resolveStaffNames';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { isVishServiceCharge } from '@/utils/serviceCategorization';

export interface StylistExperienceScore {
  staffId: string;
  staffName: string;
  photoUrl: string | null;
  compositeScore: number;
  status: 'needs-attention' | 'watch' | 'strong';
  metrics: {
    rebookRate: number;
    tipRate: number;
    retentionRate: number;
    retailAttachment: number;
  };
  appointmentCount: number;
}

// Weights for each metric
const WEIGHTS = {
  rebookRate: 0.35,
  tipRate: 0.30,
  retentionRate: 0.20,
  retailAttachment: 0.15,
};

// Minimum appointments required for scoring
const MIN_APPOINTMENTS = 5;

function getStatus(score: number): 'needs-attention' | 'watch' | 'strong' {
  if (score < 50) return 'needs-attention';
  if (score < 70) return 'watch';
  return 'strong';
}

// Normalize tip rate to 0-100 scale (assuming 25% is max/excellent)
function normalizeTipRate(tipRate: number): number {
  const maxTipRate = 25;
  return Math.min((tipRate / maxTipRate) * 100, 100);
}

export function useStylistExperienceScore(
  locationId?: string,
  dateRange: 'tomorrow' | '7days' | '30days' | '90days' = '30days',
  customDateFrom?: string,
  customDateTo?: string,
) {
  // Calculate date range
  const getDateRange = () => {
    // If custom dates provided, use them directly
    if (customDateFrom && customDateTo) {
      return { startDate: customDateFrom, endDate: customDateTo };
    }
    const today = startOfDay(new Date());
    switch (dateRange) {
      case 'tomorrow':
        // For tomorrow, use the past 30 days for scoring
        return {
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case '7days':
        return {
          startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case '30days':
        return {
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case '90days':
        return {
          startDate: format(subDays(today, 90), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      default:
        return {
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
    }
  };

  const { startDate, endDate } = getDateRange();

  return useQuery({
    queryKey: ['stylist-experience-score', locationId, startDate, endDate],
    queryFn: async () => {
      // Fetch completed appointments with tip amounts
      const appointments = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select(`
            phorest_staff_id,
            stylist_user_id,
            total_price,
            tip_amount,
            rebooked_at_checkout,
            phorest_client_id,
            is_new_client
          `)
          .eq('status', 'completed')
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate)
          .not('phorest_staff_id', 'is', null)
          .range(from, to);

        if (locationId) {
          q = q.eq('location_id', locationId);
        }

        return q;
      });

      // (Staff resolution moved after staffAppointments is built)

      // (No longer fetching stale phorest_performance_metrics for retention)

      // Fetch transaction items for retail attachment
      const transactionItems = await fetchAllBatched<any>((from, to) =>
        supabase
          .from('phorest_transaction_items')
          .select('phorest_staff_id, item_type, total_amount')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .range(from, to)
      );

      // Group appointments by staff
      const staffAppointments = new Map<string, typeof appointments>();
      appointments?.forEach(apt => {
        const staffId = apt.phorest_staff_id!;
        if (!staffAppointments.has(staffId)) {
          staffAppointments.set(staffId, []);
        }
        staffAppointments.get(staffId)!.push(apt);
      });

      // Calculate retail attachment by staff
      const staffRetail = new Map<string, { retail: number; total: number }>();
      transactionItems?.forEach(item => {
        if (!item.phorest_staff_id) return;
        if (!staffRetail.has(item.phorest_staff_id)) {
          staffRetail.set(item.phorest_staff_id, { retail: 0, total: 0 });
        }
        const data = staffRetail.get(item.phorest_staff_id)!;
        data.total += item.total_amount || 0;
        if ((item.item_type === 'Product' || item.item_type === 'product') && !isVishServiceCharge(item.item_name, item.item_type)) {
          data.retail += item.total_amount || 0;
        }
      });


      // Fetch staff names and photos via centralized resolver
      const allStaffIds = [...staffAppointments.keys()];
      const staffNameData = await resolveStaffNames(allStaffIds);

      // Also fetch photos from employee_profiles
      const userIdsForPhotos = Object.values(staffNameData.phorestToUserId);
      const { data: photoProfiles } = userIdsForPhotos.length > 0
        ? await supabase
            .from('employee_profiles')
            .select('user_id, photo_url')
            .in('user_id', userIdsForPhotos)
        : { data: [] };
      const photoMap = new Map((photoProfiles || []).map(p => [p.user_id, p.photo_url]));

      // Build staff name/photo lookup + phorest→user_id mapping
      const staffInfo = new Map<string, { name: string; photoUrl: string | null }>();
      const phorestToUserId = new Map<string, string>();
      allStaffIds.forEach(phorestId => {
        const name = staffNameData.byPhorestId[phorestId] || 'Unknown';
        const userId = staffNameData.phorestToUserId[phorestId];
        staffInfo.set(phorestId, {
          name,
          photoUrl: userId ? photoMap.get(userId) || null : null,
        });
        if (userId) {
          phorestToUserId.set(phorestId, userId);
        }
      });

      // Calculate scores for each staff
      const scores: StylistExperienceScore[] = [];

      staffAppointments.forEach((apts, staffId) => {
        // Skip if not enough appointments
        if (apts.length < MIN_APPOINTMENTS) return;

        const info = staffInfo.get(staffId) || { name: 'Unknown', photoUrl: null };
        
        // Calculate rebook rate
        const rebooked = apts.filter(a => a.rebooked_at_checkout === true).length;
        const rebookRate = (rebooked / apts.length) * 100;

        // Calculate tip rate (avg tip as % of service price)
        const tipRates = apts
          .filter(a => a.total_price && a.total_price > 0)
          .map(a => {
            const tip = a.tip_amount || 0;
            return (tip / a.total_price!) * 100;
          });
        const avgTipRate = tipRates.length > 0 
          ? tipRates.reduce((sum, r) => sum + r, 0) / tipRates.length 
          : 0;

        // Compute retention from appointments: returning clients / total unique clients
        const uniqueClients = new Set(apts.map((a: any) => a.phorest_client_id).filter(Boolean));
        const newClients = apts.filter((a: any) => a.is_new_client === true);
        const newClientIds = new Set(newClients.map((a: any) => a.phorest_client_id).filter(Boolean));
        const returningCount = uniqueClients.size - newClientIds.size;
        const computedRetention = uniqueClients.size > 0 ? (returningCount / uniqueClients.size) * 100 : 0;

        // Use computed retention only; neutral default if no client data
        const retentionRate = uniqueClients.size > 0
          ? computedRetention
          : 50;

        // Calculate retail attachment rate
        const retailData = staffRetail.get(staffId);
        const retailAttachment = retailData && retailData.total > 0
          ? (retailData.retail / retailData.total) * 100
          : 0;

        // Normalize tip rate to 0-100 scale
        const normalizedTipRate = normalizeTipRate(avgTipRate);

        // Calculate composite score
        const compositeScore = 
          (rebookRate * WEIGHTS.rebookRate) +
          (normalizedTipRate * WEIGHTS.tipRate) +
          (retentionRate * WEIGHTS.retentionRate) +
          (retailAttachment * WEIGHTS.retailAttachment);

        scores.push({
          staffId: phorestToUserId.get(staffId) || staffId,
          staffName: info.name,
          photoUrl: info.photoUrl,
          compositeScore: Math.round(compositeScore),
          status: getStatus(compositeScore),
          metrics: {
            rebookRate: Math.round(rebookRate),
            tipRate: Math.round(avgTipRate * 10) / 10, // One decimal place
            retentionRate: Math.round(retentionRate),
            retailAttachment: Math.round(retailAttachment),
          },
          appointmentCount: apts.length,
        });
      });

      // Sort by score ascending (show concerns first)
      scores.sort((a, b) => a.compositeScore - b.compositeScore);

      return scores;
    },
  });
}
