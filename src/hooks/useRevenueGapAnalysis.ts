import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

/**
 * Sums total_price from ALL phorest_appointments in a date range
 * regardless of status (cancelled + no-show + completed).
 * This is the "what was on the books" number for gap analysis.
 *
 * NOTE: No is_parent filter applied. Current data has unique phorest_id
 * per row (no parent+child duplication). If Phorest ever sends sub-appointments,
 * add `.is('is_parent', true)` to avoid double-counting.
 */
export function useScheduledRevenue(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
  enabled = true
) {
  return useQuery<number>({
    queryKey: ['scheduled-revenue', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<{ total_price: number | null; expected_price: number | null; tip_amount: number | null }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('total_price, expected_price, tip_amount')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('total_price', 'is', null)
          .range(from, to);
        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }
        return q;
      });
      // Use expected_price (discount-adjusted) when available, fall back to total_price; subtract tips
      return data?.reduce((sum, r) => {
        const base = Number(r.expected_price) || Number(r.total_price) || 0;
        const tip = Number(r.tip_amount) || 0;
        return sum + (base - tip);
      }, 0) ?? 0;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export type GapReason = 'cancelled' | 'no_show' | 'not_concluded' | 'no_pos_record' | 'service_changed' | 'discount' | 'pricing_diff';

export interface GapItem {
  id: string;
  clientName: string;
  serviceName: string;
  stylistName: string | null;
  reason: GapReason;
  scheduledAmount: number;
  actualAmount: number;
  variance: number;
  appointmentDate: string;
  /** Original appointment status from Phorest */
  status?: string;
  /** Only for pricing items: services found in POS */
  actualServices?: string[];
}

export interface GapSummary {
  reason: GapReason;
  label: string;
  count: number;
  totalVariance: number;
}

export interface RevenueGapAnalysis {
  expectedRevenue: number;
  actualRevenue: number;
  gapAmount: number;
  gapPercent: number;
  gapItems: GapItem[];
  summaries: GapSummary[];
  unexplainedGap: number;
}

/**
 * Unified gap analysis: returns a single sorted list of every appointment
 * that contributed to the revenue gap, each tagged with a reason.
 */
export function useRevenueGapAnalysis(
  dateFrom: string,
  dateTo: string,
  expectedRevenue: number,
  actualRevenue: number,
  enabled: boolean,
  locationId?: string | null
) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rangeIncludesToday = dateFrom <= todayStr && dateTo >= todayStr;
  return useQuery<RevenueGapAnalysis>({
    queryKey: ['revenue-gap-analysis', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // ── Staff mapping ──
      const { data: staffMap } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, phorest_staff_name');

      const staffLookup = new Map<string, string>();
      (staffMap ?? []).forEach((s) => {
        if (s.phorest_staff_id && s.phorest_staff_name)
          staffLookup.set(s.phorest_staff_id, s.phorest_staff_name);
      });

      // ── Fetch all gap-relevant appointments in one go ──
      const allAppts = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('id, service_name, client_name, total_price, expected_price, discount_amount, discount_reason, appointment_date, start_time, phorest_staff_id, phorest_client_id, status')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .in('status', ['cancelled', 'no_show', 'completed', 'confirmed', 'pending', 'arrived', 'started', 'booked'])
          .range(from, to);
        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }
        return q;
      });

      // ── Client name resolution from phorest_clients ──
      const clientIds = [...new Set(
        (allAppts ?? []).map(a => a.phorest_client_id).filter((id): id is string => !!id)
      )];

      const clientNameMap = new Map<string, string>();
      if (clientIds.length > 0) {
        for (let i = 0; i < clientIds.length; i += 100) {
          const chunk = clientIds.slice(i, i + 100);
          const { data: clientData } = await supabase
            .from('v_all_clients')
            .select('phorest_client_id, name, first_name, last_name')
            .in('phorest_client_id', chunk);
          (clientData ?? []).forEach(c => {
            if (!c.phorest_client_id) return;
            const resolved = c.name || [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
            if (resolved) clientNameMap.set(c.phorest_client_id, resolved);
          });
        }
      }

      const resolveClient = (a: { phorest_client_id: string | null; client_name: string | null }) =>
        (a.phorest_client_id ? clientNameMap.get(a.phorest_client_id) : null) ?? a.client_name ?? 'Walk-in';

      // ── Split by status ──
      const cancelled = (allAppts ?? []).filter(a => a.status === 'cancelled');
      const noShows = (allAppts ?? []).filter(a => a.status === 'no_show');
      const completed = (allAppts ?? []).filter(a => a.status === 'completed');
      const notConcluded = (allAppts ?? []).filter(a => 
        a.status && !['cancelled', 'no_show', 'completed'].includes(a.status)
      );

      // ── Build gap items for cancellations & no-shows ──
      const gapItems: GapItem[] = [];

      cancelled.forEach(a => {
        const price = Number(a.expected_price) || Number(a.total_price) || 0;
        if (price <= 0) return;
        gapItems.push({
          id: a.id,
          clientName: resolveClient(a),
          serviceName: a.service_name || 'Unknown service',
          stylistName: a.phorest_staff_id ? staffLookup.get(a.phorest_staff_id) ?? null : null,
          reason: 'cancelled',
          scheduledAmount: price,
          actualAmount: 0,
          variance: price,
          appointmentDate: a.appointment_date,
          status: a.status,
        });
      });

      noShows.forEach(a => {
        const price = Number(a.expected_price) || Number(a.total_price) || 0;
        if (price <= 0) return;
        gapItems.push({
          id: a.id,
          clientName: resolveClient(a),
          serviceName: a.service_name || 'Unknown service',
          stylistName: a.phorest_staff_id ? staffLookup.get(a.phorest_staff_id) ?? null : null,
          reason: 'no_show',
          scheduledAmount: price,
          actualAmount: 0,
          variance: price,
          appointmentDate: a.appointment_date,
          status: a.status,
        });
      });

      // ── Not-yet-concluded appointments (today filter) ──
      notConcluded.forEach(a => {
        const price = Number(a.expected_price) || Number(a.total_price) || 0;
        if (price <= 0) return;
        gapItems.push({
          id: a.id,
          clientName: resolveClient(a),
          serviceName: a.service_name || 'Unknown service',
          stylistName: a.phorest_staff_id ? staffLookup.get(a.phorest_staff_id) ?? null : null,
          reason: 'not_concluded',
          scheduledAmount: price,
          actualAmount: 0,
          variance: price,
          appointmentDate: a.appointment_date,
          status: a.status,
        });
      });

      // ── POS matching for completed appointments (client-day level) ──
      const completedClientIds = [...new Set(
        completed.map(a => a.phorest_client_id).filter((id): id is string => !!id)
      )];

      let posItems: Array<{
        phorest_client_id: string | null;
        transaction_date: string;
        item_name: string;
        total_amount: number | null;
        tax_amount: number | null;
        discount: number | null;
        item_type: string;
      }> = [];

      if (completedClientIds.length > 0) {
        for (let i = 0; i < completedClientIds.length; i += 100) {
          const chunk = completedClientIds.slice(i, i + 100);
          const chunkData = await fetchAllBatched<any>((from, to) => {
            let q = supabase
              .from('v_all_transaction_items')
              .select('external_client_id, transaction_date, item_name, total_amount, tax_amount, discount, item_type')
              .in('phorest_client_id', chunk)
              .gte('transaction_date', dateFrom)
              .lte('transaction_date', dateTo)
              .in('item_type', ['service', 'sale_fee'])
              .range(from, to);
            if (locationId && locationId !== 'all') {
              q = q.eq('location_id', locationId);
            }
            return q;
          });
          posItems = posItems.concat(chunkData);
        }
      }

      // Group completed appts by client-day
      const clientDayScheduled = new Map<string, {
        clientName: string;
        services: string[];
        totalScheduled: number;
        appointmentDate: string;
        stylistName: string | null;
        ids: string[];
      }>();

      completed.forEach(a => {
        // Null-client appointments can never match POS — emit as individual gap items
        if (!a.phorest_client_id) {
          const price = Number(a.expected_price) || Number(a.total_price) || 0;
          const isApptToday = rangeIncludesToday && a.appointment_date === todayStr;
          if (price > 0) {
            gapItems.push({
              id: a.id,
              clientName: a.client_name ?? 'Walk-in',
              serviceName: a.service_name || 'Unknown service',
              stylistName: a.phorest_staff_id ? staffLookup.get(a.phorest_staff_id) ?? null : null,
              reason: isApptToday ? 'not_concluded' : 'no_pos_record',
              scheduledAmount: price,
              actualAmount: 0,
              variance: price,
              appointmentDate: a.appointment_date,
            });
          }
          return;
        }
        const key = `${a.phorest_client_id}|${a.appointment_date}`;
        const stylist = a.phorest_staff_id ? staffLookup.get(a.phorest_staff_id) ?? null : null;
        const existing = clientDayScheduled.get(key);
        if (existing) {
          existing.services.push(a.service_name || 'Unknown service');
          existing.totalScheduled += Number(a.expected_price) || Number(a.total_price) || 0;
          existing.ids.push(a.id);
          if (!existing.stylistName && stylist) existing.stylistName = stylist;
        } else {
          clientDayScheduled.set(key, {
            clientName: resolveClient(a),
            services: [a.service_name || 'Unknown service'],
            totalScheduled: Number(a.expected_price) || Number(a.total_price) || 0,
            appointmentDate: a.appointment_date,
            stylistName: stylist,
            ids: [a.id],
          });
        }
      });

      // Group POS items by client-day
      const clientDayActual = new Map<string, {
        services: string[];
        totalActual: number;
        hasDiscount: boolean;
      }>();

      posItems.forEach(t => {
        if (!t.phorest_client_id) return;
        const txDate = t.transaction_date.substring(0, 10);
        const key = `${t.phorest_client_id}|${txDate}`;
        const amount = (Number(t.total_amount) || 0) + (Number(t.tax_amount) || 0);
        const hasDisc = (Number(t.discount) || 0) > 0;
        const existing = clientDayActual.get(key);
        if (existing) {
          existing.services.push(t.item_name || 'Unknown');
          existing.totalActual += amount;
          if (hasDisc) existing.hasDiscount = true;
        } else {
          clientDayActual.set(key, {
            services: [t.item_name || 'Unknown'],
            totalActual: amount,
            hasDiscount: hasDisc,
          });
        }
      });

      // Compute pricing variances → GapItems
      clientDayScheduled.forEach((scheduled, key) => {
        const actual = clientDayActual.get(key);
        const actualAmount = actual?.totalActual ?? 0;
        const variance = scheduled.totalScheduled - actualAmount;

        if (variance <= 1) return; // skip negligible

        const isApptToday = rangeIncludesToday && scheduled.appointmentDate === todayStr;
        let reason: GapReason;
        if (!actual) {
          reason = isApptToday ? 'not_concluded' : 'no_pos_record';
        } else {
          const servicesChanged = JSON.stringify(scheduled.services.sort()) !== JSON.stringify(actual.services.sort());
          if (actual.hasDiscount) reason = 'discount';
          else if (servicesChanged) reason = 'service_changed';
          else reason = 'pricing_diff';
        }

        gapItems.push({
          id: scheduled.ids[0],
          clientName: scheduled.clientName,
          serviceName: scheduled.services.join(', '),
          stylistName: scheduled.stylistName,
          reason,
          scheduledAmount: scheduled.totalScheduled,
          actualAmount,
          variance,
          appointmentDate: scheduled.appointmentDate,
          actualServices: actual?.services,
        });
      });

      // Sort by variance descending
      gapItems.sort((a, b) => b.variance - a.variance);

      // Build summaries
      const summaryMap = new Map<GapReason, { count: number; totalVariance: number }>();
      gapItems.forEach(item => {
        const existing = summaryMap.get(item.reason);
        if (existing) {
          existing.count++;
          existing.totalVariance += item.variance;
        } else {
          summaryMap.set(item.reason, { count: 1, totalVariance: item.variance });
        }
      });

      const reasonLabels: Record<GapReason, string> = {
        cancelled: 'Cancellations',
        no_show: 'No-shows',
        not_concluded: 'Not yet concluded',
        no_pos_record: 'No POS record',
        discount: 'Discounts',
        service_changed: 'Service changed',
        pricing_diff: 'Pricing differences',
      };

      const reasonOrder: GapReason[] = ['not_concluded', 'cancelled', 'no_show', 'no_pos_record', 'discount', 'service_changed', 'pricing_diff'];
      const summaries: GapSummary[] = reasonOrder
        .filter(r => summaryMap.has(r))
        .map(r => ({
          reason: r,
          label: reasonLabels[r],
          count: summaryMap.get(r)!.count,
          totalVariance: summaryMap.get(r)!.totalVariance,
        }));

      const gapAmount = expectedRevenue - actualRevenue;
      const gapPercent = expectedRevenue > 0 ? (gapAmount / expectedRevenue) * 100 : 0;
      const explainedGap = gapItems.reduce((sum, i) => sum + i.variance, 0);
      const unexplainedGap = Math.max(0, gapAmount - explainedGap);

      return {
        expectedRevenue,
        actualRevenue,
        gapAmount,
        gapPercent,
        gapItems,
        summaries,
        unexplainedGap,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
