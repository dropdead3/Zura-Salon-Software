/**
 * useStylistPeerAverages — Fetches aggregated averages for stylists at the
 * same level within the same organization, providing peer context.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { subDays, format } from 'date-fns';

export interface PeerAverages {
  avgRevenue: number;
  avgRetailPct: number;
  avgRebookPct: number;
  avgRetentionRate: number;
  avgTicket: number;
  avgUtilization: number;
  avgRevPerHour: number;
  peerCount: number;
}

export function useStylistPeerAverages(
  currentLevelSlug: string | undefined,
  userId: string | undefined,
  evalDays: number = 30,
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Get all employee profiles at same level
  const { data: peerProfiles } = useQuery({
    queryKey: ['peer-profiles', orgId, currentLevelSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id')
        .eq('organization_id', orgId!)
        .eq('stylist_level', currentLevelSlug!);
      if (error) throw error;
      return (data || []).filter(p => p.user_id !== userId);
    },
    enabled: !!orgId && !!currentLevelSlug && !!userId,
  });

  const peerIds = useMemo(() => peerProfiles?.map(p => p.user_id) || [], [peerProfiles]);
  const endStr = format(new Date(), 'yyyy-MM-dd');
  const startStr = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');

  // Fetch sales data for all peers
  const { data: peerSales } = useQuery({
    queryKey: ['peer-sales', peerIds, startStr, endStr],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('user_id, service_revenue, product_revenue, summary_date')
        .in('user_id', peerIds)
        .gte('summary_date', startStr)
        .lte('summary_date', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: peerIds.length > 0,
  });

  // Fetch appointment data for all peers
  const { data: peerAppts } = useQuery({
    queryKey: ['peer-appts', peerIds, startStr, endStr],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('staff_user_id, total_price, rebooked_at_checkout, appointment_date, status, is_new_client, duration_minutes, client_id')
        .in('staff_user_id', peerIds)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
    enabled: peerIds.length > 0,
  });

  const averages = useMemo<PeerAverages | null>(() => {
    if (!peerIds.length) return null;

    const perUser: Map<string, {
      serviceRev: number; productRev: number;
      appts: any[]; rebooked: number;
    }> = new Map();

    for (const uid of peerIds) {
      perUser.set(uid, { serviceRev: 0, productRev: 0, appts: [], rebooked: 0 });
    }

    for (const s of peerSales || []) {
      const u = perUser.get(s.user_id);
      if (u) {
        u.serviceRev += Number(s.service_revenue) || 0;
        u.productRev += Number(s.product_revenue) || 0;
      }
    }

    for (const a of peerAppts || []) {
      const uid = (a as any).staff_user_id;
      const u = perUser.get(uid);
      if (u && a.status !== 'no_show') {
        u.appts.push(a);
        if (a.rebooked_at_checkout) u.rebooked++;
      }
    }

    let totalRevenue = 0, totalRetailPct = 0, totalRebook = 0;
    let totalTicket = 0, totalUtil = 0, totalRevHr = 0;
    let countWithData = 0;

    for (const [, u] of perUser) {
      if (u.appts.length === 0 && u.serviceRev === 0) continue;
      countWithData++;
      const totalRev = u.serviceRev + u.productRev;
      const monthlyRev = evalDays > 0 ? (totalRev / evalDays) * 30 : 0;
      totalRevenue += monthlyRev;
      totalRetailPct += totalRev > 0 ? (u.productRev / totalRev) * 100 : 0;
      totalRebook += u.appts.length > 0 ? (u.rebooked / u.appts.length) * 100 : 0;
      const avgTix = u.appts.length > 0
        ? u.appts.reduce((s, a) => s + (Number(a.total_price) || 0), 0) / u.appts.length
        : 0;
      totalTicket += avgTix;
      const totalMin = u.appts.reduce((s: number, a: any) => s + (Number(a.duration_minutes) || 60), 0);
      const apptRev = u.appts.reduce((s: number, a: any) => s + (Number(a.total_price) || 0), 0);
      totalRevHr += totalMin > 0 ? (apptRev / totalMin) * 60 : 0;
      const activeDays = new Set(u.appts.map((a: any) => a.appointment_date)).size;
      totalUtil += activeDays > 0 ? Math.min(100, (totalMin / activeDays / 480) * 100) : 0;
    }

    if (countWithData === 0) return null;

    return {
      avgRevenue: Math.round(totalRevenue / countWithData),
      avgRetailPct: Math.round((totalRetailPct / countWithData) * 10) / 10,
      avgRebookPct: Math.round((totalRebook / countWithData) * 10) / 10,
      avgRetentionRate: 0, // requires dual-window — deferred
      avgTicket: Math.round(totalTicket / countWithData),
      avgUtilization: Math.round((totalUtil / countWithData) * 10) / 10,
      avgRevPerHour: Math.round(totalRevHr / countWithData),
      peerCount: countWithData,
    };
  }, [peerIds, peerSales, peerAppts, evalDays]);

  return averages;
}
