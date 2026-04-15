import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { getServiceCategory } from '@/utils/serviceCategorization';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

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

export interface RawTipAppointment {
  phorest_staff_id: string | null;
  stylist_user_id: string | null;
  tip_amount: number | null;
  total_price: number | null;
  service_name: string | null;
  appointment_date: string;
  phorest_client_id: string | null;
  location_id: string | null;
  start_time: string | null;
}

export type ClientMap = Map<string, string>;

export interface TipsDrilldownData {
  byStylist: StylistTipMetrics[];
  byTotalTips: StylistTipMetrics[];
  byCategory: Record<string, CategoryTipMetrics>;
  byPaymentMethod: Record<string, PaymentMethodTipMetrics>;
  rawAppointments: RawTipAppointment[];
  clientMap: ClientMap;
  isLoading: boolean;
  error: Error | null;
}

interface UseTipsDrilldownParams {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  minAppointments?: number;
}

export function useTipsDrilldown({ dateFrom, dateTo, locationId, minAppointments = 10 }: UseTipsDrilldownParams): TipsDrilldownData {

  // Fetch appointments with tips data
  const { data: appointments, isLoading: aptsLoading, error: aptsError } = useQuery({
    queryKey: ['tips-drilldown-appointments', dateFrom, dateTo, locationId],
    queryFn: async () => {
      return fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('stylist_user_id, tip_amount, total_price, service_name, service_category, location_id, phorest_client_id, appointment_date, staff_user_id, start_time')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to);

        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }

        return q;
      });
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

  // Fetch phorest staff mapping for name resolution of unmapped staff
  const { data: staffMapping, isLoading: staffMappingLoading } = useQuery({
    queryKey: ['tips-drilldown-staff-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, phorest_staff_name, user_id');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch client names for visit-level resolution
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['tips-drilldown-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_all_clients')
        .select('phorest_client_id, first_name, last_name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Build client name map
  const clientMap = useMemo<ClientMap>(() => {
    const map = new Map<string, string>();
    if (clientsData) {
      for (const c of clientsData) {
        if (c.phorest_client_id) {
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
          if (name) map.set(c.phorest_client_id, name);
        }
      }
    }
    return map;
  }, [clientsData]);

  // Fetch payment method data from transaction items
  const { data: transactionItems, isLoading: txLoading } = useQuery({
    queryKey: ['tips-drilldown-payment-methods', dateFrom, dateTo, locationId],
    queryFn: async () => {
      return fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('payment_method, tip_amount, staff_user_id, phorest_client_id, transaction_date')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .gt('tip_amount', 0)
          .range(from, to);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const result = useMemo(() => {
    if (!appointments || !profiles) {
      return { byStylist: [], byTotalTips: [], byCategory: {}, byPaymentMethod: {} };
    }

    // Build profile map from employee_profiles
    const profileMap = new Map(
      profiles.map(p => [p.user_id, { name: formatDisplayName(p.full_name || '', p.display_name), photo: p.photo_url }])
    );

    // Build staff name map from phorest_staff_mapping for unmapped staff
    const staffNameMap = new Map<string, { name: string; photo: string | null }>();
    if (staffMapping) {
      for (const sm of staffMapping) {
        const key = `phorest:${sm.staff_user_id}`;
        staffNameMap.set(key, { name: sm.phorest_staff_name || 'Staff Member', photo: null });
        // If this mapping has a user_id, ensure profileMap has the name too
        if (sm.user_id && !profileMap.has(sm.user_id)) {
          profileMap.set(sm.user_id, { name: sm.phorest_staff_name || 'Staff Member', photo: null });
        }
      }
    }

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

    // Build a corrected tip lookup from transaction items.
    // Phorest duplicates the SAME tip_amount on every line item in a checkout,
    // so we deduplicate by staff+client+date to get the true per-checkout tip.
    const correctedTipMap = new Map<string, number>();
    if (transactionItems) {
      for (const ti of transactionItems) {
        const tipAmt = ti.tip_amount ?? 0;
        if (tipAmt <= 0) continue;
        const key = `${ti.staff_user_id}|${ti.phorest_client_id}|${ti.transaction_date}`;
        // All items in a checkout have the same tip — just keep one
        if (!correctedTipMap.has(key)) {
          correctedTipMap.set(key, tipAmt);
        }
      }
    }

    // Deduplicate appointment rows: multiple service rows per checkout
    const seenTipKeys = new Set<string>();

    for (const apt of appointments) {
      const revenue = apt.total_price ?? 0;
      const category = apt.service_category || getServiceCategory(apt.service_name);

      // Use corrected tip from transaction items when available
      const tipLookupKey = `${apt.staff_user_id}|${apt.phorest_client_id}|${apt.appointment_date}`;
      const correctedTip = correctedTipMap.get(tipLookupKey);
      const tipForThisCheckout = correctedTip ?? (apt.tip_amount ?? 0);

      // Deduplicate: only count tip once per staff+client+date
      let dedupedTip = tipForThisCheckout;
      if (tipForThisCheckout > 0) {
        if (seenTipKeys.has(tipLookupKey)) {
          dedupedTip = 0; // Already counted
        } else {
          seenTipKeys.add(tipLookupKey);
        }
      }

      // Stylist aggregation — use phorest_staff_id as fallback key
      const staffKey = apt.stylist_user_id || (apt.staff_user_id ? `phorest:${apt.staff_user_id}` : null);
      if (staffKey) {
        const existing = stylistMap.get(staffKey) ?? {
          totalTips: 0, totalRevenue: 0, noTipCount: 0, count: 0, locationId: apt.location_id
        };
        existing.totalTips += dedupedTip;
        existing.totalRevenue += revenue;
        existing.noTipCount += tipForThisCheckout === 0 ? 1 : 0;
        existing.count += 1;
        stylistMap.set(staffKey, existing);
      }

      // Category aggregation
      const catExisting = categoryMap.get(category) ?? { totalTips: 0, totalRevenue: 0, count: 0 };
      catExisting.totalTips += dedupedTip;
      catExisting.totalRevenue += revenue;
      catExisting.count += 1;
      categoryMap.set(category, catExisting);
    }

    // Helper to resolve name/photo from combined maps
    const resolveStaff = (key: string) => {
      // Try employee profile first (for user_id keys)
      const profile = profileMap.get(key);
      if (profile) return profile;
      // Try phorest staff mapping (for phorest: prefixed keys)
      const staffInfo = staffNameMap.get(key);
      if (staffInfo) return staffInfo;
      return { name: 'Staff Member', photo: null };
    };

    // Build stylist array (avg-rate ranking, minAppointments threshold)
    const byStylist: StylistTipMetrics[] = [];
    for (const [staffKey, data] of stylistMap) {
      if (data.count < minAppointments) continue;
      const resolved = resolveStaff(staffKey);
      byStylist.push({
        stylistUserId: staffKey,
        displayName: resolved.name,
        photoUrl: resolved.photo,
        avgTip: data.count > 0 ? data.totalTips / data.count : 0,
        tipPercentage: data.totalRevenue > 0 ? (data.totalTips / data.totalRevenue) * 100 : 0,
        noTipRate: data.count > 0 ? (data.noTipCount / data.count) * 100 : 0,
        totalTips: data.totalTips,
        appointmentCount: data.count,
        locationId: data.locationId,
      });
    }
    byStylist.sort((a, b) => b.avgTip - a.avgTip);

    // Build byTotalTips: all staff with any tips, no minimum threshold
    const byTotalTips: StylistTipMetrics[] = [];
    for (const [staffKey, data] of stylistMap) {
      if (data.totalTips <= 0) continue;
      const resolved = resolveStaff(staffKey);
      byTotalTips.push({
        stylistUserId: staffKey,
        displayName: resolved.name,
        photoUrl: resolved.photo,
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

    // Build payment method record from transaction items (deduplicated)
    const byPaymentMethod: Record<string, PaymentMethodTipMetrics> = {};
    if (transactionItems) {
      const seenTxTipKeys = new Set<string>();
      for (const ti of transactionItems) {
        const tipAmt = ti.tip_amount ?? 0;
        if (tipAmt === 0) continue;
        const txKey = `${ti.staff_user_id}|${ti.phorest_client_id}|${ti.transaction_date}|${tipAmt}`;
        if (seenTxTipKeys.has(txKey)) continue;
        seenTxTipKeys.add(txKey);
        const method = ti.payment_method || 'Unknown';
        const existing = byPaymentMethod[method] ?? { totalTips: 0, count: 0 };
        existing.totalTips += tipAmt;
        existing.count += 1;
        byPaymentMethod[method] = existing;
      }
    }

    return { byStylist, byTotalTips, byCategory, byPaymentMethod };
  }, [appointments, profiles, staffMapping, transactionItems, minAppointments]);

  return {
    ...result,
    rawAppointments: (appointments ?? []) as RawTipAppointment[],
    clientMap,
    isLoading: aptsLoading || profilesLoading || staffMappingLoading || txLoading || clientsLoading,
    error: aptsError as Error | null,
  };
}
