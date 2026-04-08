/**
 * useStylistPeerAverages — Fetches aggregated averages for stylists at the
 * same level within the same organization, providing peer context.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { buildTimeOffSet, isUserOffOnDate } from '@/lib/time-off-utils';
import { subDays, format } from 'date-fns';

export interface PeerVelocity {
  revenueVelocity: number;
  retailVelocity: number;
  rebookVelocity: number;
  retentionVelocity: number;
  ticketVelocity: number;
  utilizationVelocity: number;
  revPerHourVelocity: number;
  newClientsVelocity: number;
}

export interface PeerAverages {
  avgRevenue: number;
  avgRetailPct: number;
  avgRebookPct: number;
  avgRetentionRate: number;
  avgTicket: number;
  avgUtilization: number;
  avgRevPerHour: number;
  avgNewClients: number;
  peerCount: number;
  /** Peer velocity: avg change per day across peers (current - prior window) */
  velocity: PeerVelocity | null;
}

export function useStylistPeerAverages(
  currentLevelSlug: string | undefined,
  userId: string | undefined,
  evalDays: number = 30,
  locationId?: string | null,
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Get all employee profiles at same level
  const { data: peerProfiles } = useQuery({
    queryKey: ['peer-profiles', orgId, currentLevelSlug, locationId],
    queryFn: async () => {
      let query = supabase
        .from('employee_profiles')
        .select('user_id, location_id')
        .eq('organization_id', orgId!)
        .eq('stylist_level', currentLevelSlug!);

      // Scope to same location if provided
      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter(p => p.user_id !== userId);
    },
    enabled: !!orgId && !!currentLevelSlug && !!userId,
  });

  const peerIds = useMemo(() => peerProfiles?.map(p => p.user_id) || [], [peerProfiles]);
  // Double the window for retention calculation (prior vs current)
  const fetchDays = evalDays * 2;
  const endStr = format(new Date(), 'yyyy-MM-dd');
  const startStr = format(subDays(new Date(), fetchDays), 'yyyy-MM-dd');
  const evalStartStr = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');

  // Fetch sales data for all peers from transaction items (POS-first)
  const { data: peerSales } = useQuery({
    queryKey: ['peer-sales', peerIds, startStr, endStr],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_transaction_items')
          .select('stylist_user_id, total_amount, tax_amount, item_type, transaction_date')
          .in('stylist_user_id', peerIds)
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        page++;
      }
      return allData;
    },
    enabled: peerIds.length > 0,
  });

  // Fetch appointment data for all peers — with pagination
  const { data: peerAppts } = useQuery({
    queryKey: ['peer-appts', peerIds, startStr, endStr],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('appointments')
          .select('staff_user_id, total_price, rebooked_at_checkout, appointment_date, status, is_new_client, duration_minutes, client_id')
          .in('staff_user_id', peerIds)
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr)
          .neq('status', 'cancelled')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        page++;
      }
      return allData;
    },
    enabled: peerIds.length > 0,
  });

  // Fetch approved time-off for peers
  const { data: peerTimeOff } = useQuery({
    queryKey: ['peer-timeoff', peerIds, startStr, endStr],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('user_id, start_date, end_date, is_full_day')
        .in('user_id', peerIds)
        .eq('status', 'approved')
        .lte('start_date', endStr)
        .gte('end_date', startStr);
      if (error) throw error;
      return data || [];
    },
    enabled: peerIds.length > 0,
  });

  const averages = useMemo<PeerAverages | null>(() => {
    if (!peerIds.length) return null;

    const timeOffSet = buildTimeOffSet(peerTimeOff || []);

    const perUser: Map<string, {
      serviceRev: number; productRev: number;
      priorServiceRev: number; priorProductRev: number;
      appts: any[]; priorAppts: any[]; rebooked: number; priorRebooked: number;
      newClients: number; priorNewClients: number;
      // For retention: prior-window and current-window client sets
      priorClients: Set<string>; currentClients: Set<string>;
    }> = new Map();

    for (const uid of peerIds) {
      perUser.set(uid, {
        serviceRev: 0, productRev: 0, priorServiceRev: 0, priorProductRev: 0,
        appts: [], priorAppts: [], rebooked: 0, priorRebooked: 0,
        newClients: 0, priorNewClients: 0,
        priorClients: new Set(), currentClients: new Set(),
      });
    }

    for (const s of peerSales || []) {
      const u = perUser.get(s.stylist_user_id);
      if (!u) continue;
      const amount = (Number(s.total_amount) || 0) + (Number(s.tax_amount) || 0);
      const itemType = (s.item_type || '').toLowerCase();
      const isCurrent = s.transaction_date >= evalStartStr;
      if (itemType === 'service') {
        if (isCurrent) u.serviceRev += amount;
        else u.priorServiceRev += amount;
      } else if (itemType === 'product') {
        if (isCurrent) u.productRev += amount;
        else u.priorProductRev += amount;
      }
    }

    for (const a of peerAppts || []) {
      const uid = (a as any).staff_user_id;
      const u = perUser.get(uid);
      if (!u || a.status === 'no_show') continue;

      // Retention: track client sets across both windows
      if (a.client_id) {
        if (a.appointment_date >= evalStartStr) {
          u.currentClients.add(a.client_id);
        } else {
          u.priorClients.add(a.client_id);
        }
      }

      // Current window only for other metrics
      if (a.appointment_date >= evalStartStr) {
        u.appts.push(a);
        if (a.rebooked_at_checkout) u.rebooked++;
        if (a.is_new_client) u.newClients++;
      } else {
        u.priorAppts.push(a);
        if (a.rebooked_at_checkout) u.priorRebooked++;
        if (a.is_new_client) u.priorNewClients++;
      }
    }

    let totalRevenue = 0, totalRetailPct = 0, totalRebook = 0;
    let totalTicket = 0, totalUtil = 0, totalRevHr = 0;
    let totalRetention = 0, totalNewClients = 0;
    let priorTotalRevenue = 0, priorTotalRetailPct = 0, priorTotalRebook = 0;
    let priorTotalTicket = 0, priorTotalUtil = 0, priorTotalRevHr = 0;
    let priorTotalNewClients = 0;
    let countWithData = 0;
    let countWithRetention = 0;
    let countWithPriorData = 0;

    for (const [uid, u] of perUser) {
      if (u.appts.length === 0 && u.serviceRev === 0) continue;
      countWithData++;
      const totalRev = u.serviceRev + u.productRev;
      const monthlyRev = evalDays > 0 ? (totalRev / evalDays) * 30 : 0;
      totalRevenue += monthlyRev;
      totalRetailPct += totalRev > 0 ? (u.productRev / totalRev) * 100 : 0;
      totalRebook += u.appts.length > 0 ? (u.rebooked / u.appts.length) * 100 : 0;
      const uniqueVisits = new Set(
        u.appts.filter((a: any) => a.client_id).map((a: any) => `${a.client_id}_${a.appointment_date}`)
      ).size || u.appts.length;
      const avgTix = uniqueVisits > 0 ? totalRev / uniqueVisits : 0;
      totalTicket += avgTix;
      totalNewClients += evalDays > 0 ? (u.newClients / evalDays) * 30 : 0;

      if (u.priorClients.size > 0) {
        const returning = [...u.currentClients].filter(id => u.priorClients.has(id)).length;
        totalRetention += (returning / u.priorClients.size) * 100;
        countWithRetention++;
      }

      const totalMin = u.appts.reduce((s: number, a: any) => s + (Number(a.duration_minutes) || 60), 0);
      totalRevHr += totalMin > 0 ? (totalRev / totalMin) * 60 : 0;
      const activeDaysArr = [...new Set(u.appts.map((a: any) => a.appointment_date))];
      const activeDays = activeDaysArr.filter(d => !isUserOffOnDate(timeOffSet, uid, d)).length;
      totalUtil += activeDays > 0 ? Math.min(100, (totalMin / activeDays / 480) * 100) : 0;

      // Prior window metrics for velocity
      const priorRev = u.priorServiceRev + u.priorProductRev;
      if (u.priorAppts.length > 0 || priorRev > 0) {
        countWithPriorData++;
        const priorMonthlyRev = evalDays > 0 ? (priorRev / evalDays) * 30 : 0;
        priorTotalRevenue += priorMonthlyRev;
        priorTotalRetailPct += priorRev > 0 ? (u.priorProductRev / priorRev) * 100 : 0;
        priorTotalRebook += u.priorAppts.length > 0 ? (u.priorRebooked / u.priorAppts.length) * 100 : 0;
        const priorVisits = new Set(
          u.priorAppts.filter((a: any) => a.client_id).map((a: any) => `${a.client_id}_${a.appointment_date}`)
        ).size || u.priorAppts.length;
        priorTotalTicket += priorVisits > 0 ? priorRev / priorVisits : 0;
        priorTotalNewClients += evalDays > 0 ? (u.priorNewClients / evalDays) * 30 : 0;
        const priorMin = u.priorAppts.reduce((s: number, a: any) => s + (Number(a.duration_minutes) || 60), 0);
        priorTotalRevHr += priorMin > 0 ? (priorRev / priorMin) * 60 : 0;
        const priorActiveDays = [...new Set(u.priorAppts.map((a: any) => a.appointment_date))]
          .filter(d => !isUserOffOnDate(timeOffSet, uid, d)).length;
        priorTotalUtil += priorActiveDays > 0 ? Math.min(100, (priorMin / priorActiveDays / 480) * 100) : 0;
      }
    }

    if (countWithData === 0) return null;

    // Compute velocity (current avg - prior avg) per day
    let velocity: PeerVelocity | null = null;
    if (countWithPriorData > 0) {
      const cRev = totalRevenue / countWithData;
      const pRev = priorTotalRevenue / countWithPriorData;
      const cRetail = totalRetailPct / countWithData;
      const pRetail = priorTotalRetailPct / countWithPriorData;
      const cRebook = totalRebook / countWithData;
      const pRebook = priorTotalRebook / countWithPriorData;
      const cTicket = totalTicket / countWithData;
      const pTicket = priorTotalTicket / countWithPriorData;
      const cUtil = totalUtil / countWithData;
      const pUtil = priorTotalUtil / countWithPriorData;
      const cRevHr = totalRevHr / countWithData;
      const pRevHr = priorTotalRevHr / countWithPriorData;
      const cNew = totalNewClients / countWithData;
      const pNew = priorTotalNewClients / countWithPriorData;

      velocity = {
        revenueVelocity: evalDays > 0 ? (cRev - pRev) / evalDays : 0,
        retailVelocity: evalDays > 0 ? (cRetail - pRetail) / evalDays : 0,
        rebookVelocity: evalDays > 0 ? (cRebook - pRebook) / evalDays : 0,
        retentionVelocity: 0, // Retention velocity requires more complex calculation
        ticketVelocity: evalDays > 0 ? (cTicket - pTicket) / evalDays : 0,
        utilizationVelocity: evalDays > 0 ? (cUtil - pUtil) / evalDays : 0,
        revPerHourVelocity: evalDays > 0 ? (cRevHr - pRevHr) / evalDays : 0,
        newClientsVelocity: evalDays > 0 ? (cNew - pNew) / evalDays : 0,
      };
    }

    return {
      avgRevenue: Math.round(totalRevenue / countWithData),
      avgRetailPct: Math.round((totalRetailPct / countWithData) * 10) / 10,
      avgRebookPct: Math.round((totalRebook / countWithData) * 10) / 10,
      avgRetentionRate: countWithRetention > 0 ? Math.round((totalRetention / countWithRetention) * 10) / 10 : 0,
      avgTicket: Math.round(totalTicket / countWithData),
      avgUtilization: Math.round((totalUtil / countWithData) * 10) / 10,
      avgRevPerHour: Math.round(totalRevHr / countWithData),
      avgNewClients: Math.round((totalNewClients / countWithData) * 10) / 10,
      peerCount: countWithData,
      velocity,
    };
  }, [peerIds, peerSales, peerAppts, peerTimeOff, evalDays, evalStartStr]);

  return averages;
}
