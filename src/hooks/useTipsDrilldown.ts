import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { getServiceCategory } from '@/utils/serviceCategorization';

export interface StylistTipMetrics {
  stylistUserId: string;
  displayName: string;
  photoUrl: string | null;
  avgTip: number;
  tipPercentage: number;
  noTipRate: number;
  totalTips: number;
  appointmentCount: number;
  locationId: string | null;
}

export interface CategoryTipMetrics {
  avgTip: number;
  tipRate: number;
  count: number;
  totalTips: number;
}

export interface PaymentMethodTipMetrics {
  totalTips: number;
  count: number;
}

export interface TipsDrilldownData {
  byStylist: StylistTipMetrics[];
  byTotalTips: StylistTipMetrics[];
  byCategory: Record<string, CategoryTipMetrics>;
  byPaymentMethod: Record<string, PaymentMethodTipMetrics>;
  isLoading: boolean;
  error: Error | null;
}

interface UseTipsDrilldownParams {
  period: 30 | 90;
  locationId?: string;
  minAppointments?: number;
}

export function useTipsDrilldown({ period, locationId, minAppointments = 10 }: UseTipsDrilldownParams): TipsDrilldownData {
  const dateFrom = useMemo(() => {
    return format(subDays(new Date(), period), 'yyyy-MM-dd');
  }, [period]);

  const dateTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Fetch appointments with tips data
  const { data: appointments, isLoading: aptsLoading, error: aptsError } = useQuery({
    queryKey: ['tips-drilldown-appointments', dateFrom, dateTo, locationId],
    queryFn: async () => {
      let query = supabase
        .from('phorest_appointments')
        .select('stylist_user_id, tip_amount, total_price, service_name, service_category, location_id, phorest_client_id, appointment_date, phorest_staff_id')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch employee profiles for names/photos
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['tips-drilldown-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch payment method data from transaction items
  const { data: transactionItems, isLoading: txLoading } = useQuery({
    queryKey: ['tips-drilldown-payment-methods', dateFrom, dateTo, locationId],
    queryFn: async () => {
      let query = supabase
        .from('phorest_transaction_items')
        .select('payment_method, tip_amount')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .gt('tip_amount', 0);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const result = useMemo(() => {
    if (!appointments || !profiles) {
      return { byStylist: [], byTotalTips: [], byCategory: {}, byPaymentMethod: {} };
    }

    const profileMap = new Map(
      profiles.map(p => [p.user_id, { name: p.display_name || p.full_name || 'Unknown', photo: p.photo_url }])
    );

    // Aggregate by stylist
    const stylistMap = new Map<string, {
      totalTips: number;
      totalRevenue: number;
      noTipCount: number;
      count: number;
      locationId: string | null;
    }>();

    // Aggregate by category
    const categoryMap = new Map<string, {
      totalTips: number;
      totalRevenue: number;
      count: number;
    }>();

    // Deduplicate tips: Phorest duplicates the same tip on every service line item
    const seenTipKeys = new Set<string>();

    for (const apt of appointments) {
      const tipRaw = apt.tip_amount ?? 0;
      const revenue = apt.total_price ?? 0;
      const category = apt.service_category || getServiceCategory(apt.service_name);

      // Check if this tip was already counted for the same staff+client+date+amount
      let dedupedTip = tipRaw;
      if (tipRaw > 0) {
        const key = `${apt.phorest_staff_id}|${apt.phorest_client_id}|${apt.appointment_date}|${tipRaw}`;
        if (seenTipKeys.has(key)) {
          dedupedTip = 0; // Already counted
        } else {
          seenTipKeys.add(key);
        }
      }

      // Stylist aggregation
      if (apt.stylist_user_id) {
        const existing = stylistMap.get(apt.stylist_user_id) ?? {
          totalTips: 0, totalRevenue: 0, noTipCount: 0, count: 0, locationId: apt.location_id
        };
        existing.totalTips += dedupedTip;
        existing.totalRevenue += revenue;
        existing.noTipCount += tipRaw === 0 ? 1 : 0;
        existing.count += 1;
        stylistMap.set(apt.stylist_user_id, existing);
      }

      // Category aggregation
      const catExisting = categoryMap.get(category) ?? { totalTips: 0, totalRevenue: 0, count: 0 };
      catExisting.totalTips += dedupedTip;
      catExisting.totalRevenue += revenue;
      catExisting.count += 1;
      categoryMap.set(category, catExisting);
    }

    // Build stylist array
    const byStylist: StylistTipMetrics[] = [];
    for (const [userId, data] of stylistMap) {
      if (data.count < minAppointments) continue;
      const profile = profileMap.get(userId);
      byStylist.push({
        stylistUserId: userId,
        displayName: profile?.name ?? 'Unknown',
        photoUrl: profile?.photo ?? null,
        avgTip: data.count > 0 ? data.totalTips / data.count : 0,
        tipPercentage: data.totalRevenue > 0 ? (data.totalTips / data.totalRevenue) * 100 : 0,
        noTipRate: data.count > 0 ? (data.noTipCount / data.count) * 100 : 0,
        totalTips: data.totalTips,
        appointmentCount: data.count,
        locationId: data.locationId,
      });
    }

    // Sort by avg tip descending
    byStylist.sort((a, b) => b.avgTip - a.avgTip);

    // Build byTotalTips: all stylists with any tips, sorted by total tips desc
    const byTotalTips: StylistTipMetrics[] = [];
    for (const [userId, data] of stylistMap) {
      if (data.totalTips <= 0) continue;
      const profile = profileMap.get(userId);
      byTotalTips.push({
        stylistUserId: userId,
        displayName: profile?.name ?? 'Unknown',
        photoUrl: profile?.photo ?? null,
        avgTip: data.count > 0 ? data.totalTips / data.count : 0,
        tipPercentage: data.totalRevenue > 0 ? (data.totalTips / data.totalRevenue) * 100 : 0,
        noTipRate: data.count > 0 ? (data.noTipCount / data.count) * 100 : 0,
        totalTips: data.totalTips,
        appointmentCount: data.count,
        locationId: data.locationId,
      });
    }
    byTotalTips.sort((a, b) => b.totalTips - a.totalTips);

    // Build category record
    const byCategory: Record<string, CategoryTipMetrics> = {};
    for (const [name, data] of categoryMap) {
      byCategory[name] = {
        avgTip: data.count > 0 ? data.totalTips / data.count : 0,
        tipRate: data.totalRevenue > 0 ? (data.totalTips / data.totalRevenue) * 100 : 0,
        count: data.count,
        totalTips: data.totalTips,
      };
    }

    // Build payment method record from transaction items
    const byPaymentMethod: Record<string, PaymentMethodTipMetrics> = {};
    if (transactionItems) {
      for (const ti of transactionItems) {
        const method = ti.payment_method || 'Unknown';
        const existing = byPaymentMethod[method] ?? { totalTips: 0, count: 0 };
        existing.totalTips += ti.tip_amount ?? 0;
        existing.count += 1;
        byPaymentMethod[method] = existing;
      }
    }

    return { byStylist, byTotalTips, byCategory, byPaymentMethod };
  }, [appointments, profiles, transactionItems, minAppointments]);

  return {
    ...result,
    isLoading: aptsLoading || profilesLoading || txLoading,
    error: aptsError as Error | null,
  };
}
