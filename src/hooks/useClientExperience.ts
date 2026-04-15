import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────

// ── Composite score weights & thresholds ──────────────────────
const WEIGHT_REBOOK = 0.35;
const WEIGHT_TIP_RATE = 0.30;
const WEIGHT_FEEDBACK = 0.20;
const WEIGHT_AVG_TIP = 0.15;
const AVG_TIP_EXCELLENT = 15; // $15 avg tip = 100 on normalized scale

export type ExperienceStatus = 'strong' | 'watch' | 'needs-attention';

function getExperienceStatus(score: number): ExperienceStatus {
  if (score >= 65) return 'strong';
  if (score >= 50) return 'watch';
  return 'needs-attention';
}

function computeComposite(tipRate: number, rebookRate: number, feedbackRate: number, avgTip: number): number {
  const normalizedTip = Math.min((avgTip / AVG_TIP_EXCELLENT) * 100, 100);
  return (
    rebookRate * WEIGHT_REBOOK +
    tipRate * WEIGHT_TIP_RATE +
    feedbackRate * WEIGHT_FEEDBACK +
    normalizedTip * WEIGHT_AVG_TIP
  );
}

export interface StaffExperienceDetail {
  staffId: string;
  staffName: string;
  userId: string | null;
  totalAppointments: number;
  avgTip: number;
  tipRate: number;
  feedbackRate: number;
  rebookRate: number;
  compositeScore: number;
  status: ExperienceStatus;
}

export interface ClientExperienceData {
  avgTip: { current: number; prior: number; percentChange: number | null };
  tipRate: { current: number; prior: number; percentChange: number | null };
  feedbackRate: { current: number; prior: number; percentChange: number | null };
  rebookRate: { current: number; prior: number; percentChange: number | null };
  compositeScore: { current: number; prior: number; percentChange: number | null };
  staffBreakdown: StaffExperienceDetail[];
  hasNames: boolean;
}

// ── Paginated fetch ────────────────────────────────────────────

async function fetchPaginatedAppointments(
  dateFrom: string,
  dateTo: string,
  locationId?: string,
) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('v_all_appointments')
      .select('phorest_staff_id, tip_amount, rebooked_at_checkout, total_price, status')
      .gte('appointment_date', dateFrom)
      .lte('appointment_date', dateTo)
      .not('status', 'in', '("cancelled","no_show")')
      .range(from, from + PAGE_SIZE - 1);

    if (locationId) query = query.eq('location_id', locationId);

    const { data, error } = await query;
    if (error) throw error;

    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}

async function fetchFeedbackCounts(dateFrom: string, dateTo: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('client_feedback_responses')
      .select('staff_user_id')
      .not('responded_at', 'is', null)
      .gte('responded_at', dateFrom)
      .lte('responded_at', dateTo + 'T23:59:59')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}

// ── Hook ───────────────────────────────────────────────────────

export function useClientExperience(
  dateFrom: string,
  dateTo: string,
  locationId?: string,
) {
  return useQuery<ClientExperienceData>({
    queryKey: ['client-experience', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // Prior period
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const durationMs = to.getTime() - from.getTime();
      const priorFrom = new Date(from.getTime() - durationMs - 86400000);
      const priorTo = new Date(from.getTime() - 86400000);
      const priorFromStr = priorFrom.toISOString().split('T')[0];
      const priorToStr = priorTo.toISOString().split('T')[0];

      // Staff mappings
      const { data: mappings } = await supabase
        .from('v_all_staff' as any)
        .select(`
          phorest_staff_id,
          user_id,
          phorest_staff_name,
          employee_profiles!phorest_staff_mapping_user_id_fkey (
            display_name,
            full_name
          )
        `);

      const mappingLookup: Record<string, { userId: string | null; name: string }> = {};
      let resolvedNameCount = 0;
      mappings?.forEach(m => {
        const profile = m.employee_profiles as any;
        const name = profile ? formatDisplayName(profile.full_name || '', profile.display_name) : (m.phorest_staff_name ? formatDisplayName(m.phorest_staff_name) : null);
        if (name) resolvedNameCount++;
        mappingLookup[m.phorest_staff_id] = { userId: m.user_id, name: name || '' };
      });

      // Build userId → phorest_staff_id reverse map for feedback matching
      const userIdToStaffId: Record<string, string> = {};
      mappings?.forEach(m => {
        if (m.user_id) userIdToStaffId[m.user_id] = m.phorest_staff_id;
      });

      // Fetch all data
      const [currentAppts, priorAppts, currentFeedback, priorFeedback] = await Promise.all([
        fetchPaginatedAppointments(dateFrom, dateTo, locationId),
        fetchPaginatedAppointments(priorFromStr, priorToStr, locationId),
        fetchFeedbackCounts(dateFrom, dateTo),
        fetchFeedbackCounts(priorFromStr, priorToStr),
      ]);

      const hasNames = resolvedNameCount > 0;

      // Build feedback counts by phorest_staff_id
      const feedbackByStaff: Record<string, number> = {};
      currentFeedback.forEach(f => {
        if (f.staff_user_id) {
          const staffId = userIdToStaffId[f.staff_user_id];
          if (staffId) feedbackByStaff[staffId] = (feedbackByStaff[staffId] || 0) + 1;
        }
      });

      // ── Aggregate per staff ──
      const staffMap: Record<string, { total: number; tipped: number; tipSum: number; rebooked: number }> = {};

      currentAppts.forEach(apt => {
        const staffId = apt.phorest_staff_id;
        if (!staffId) return;
        if (!staffMap[staffId]) staffMap[staffId] = { total: 0, tipped: 0, tipSum: 0, rebooked: 0 };
        const e = staffMap[staffId];
        e.total += 1;
        const tip = Number(apt.tip_amount) || 0;
        if (tip > 0) { e.tipped += 1; e.tipSum += tip; }
        if (apt.rebooked_at_checkout === true) e.rebooked += 1;
      });

      // ── Salon-wide current ──
      const totalAppts = currentAppts.length;
      const totalTipSum = currentAppts.reduce((s, a) => s + (Number(a.tip_amount) || 0), 0);
      const totalTipped = currentAppts.filter(a => (Number(a.tip_amount) || 0) > 0).length;
      const totalRebooked = currentAppts.filter(a => a.rebooked_at_checkout === true).length;
      const totalFeedback = currentFeedback.length;

      const avgTipCurrent = totalAppts > 0 ? totalTipSum / totalAppts : 0;
      const tipRateCurrent = totalAppts > 0 ? (totalTipped / totalAppts) * 100 : 0;
      const feedbackRateCurrent = totalAppts > 0 ? (totalFeedback / totalAppts) * 100 : 0;
      const rebookRateCurrent = totalAppts > 0 ? (totalRebooked / totalAppts) * 100 : 0;

      // ── Salon-wide prior ──
      const priorTotal = priorAppts.length;
      const priorTipSum = priorAppts.reduce((s, a) => s + (Number(a.tip_amount) || 0), 0);
      const priorTipped = priorAppts.filter(a => (Number(a.tip_amount) || 0) > 0).length;
      const priorRebooked = priorAppts.filter(a => a.rebooked_at_checkout === true).length;
      const priorFeedbackTotal = priorFeedback.length;

      const avgTipPrior = priorTotal > 0 ? priorTipSum / priorTotal : 0;
      const tipRatePrior = priorTotal > 0 ? (priorTipped / priorTotal) * 100 : 0;
      const feedbackRatePrior = priorTotal > 0 ? (priorFeedbackTotal / priorTotal) * 100 : 0;
      const rebookRatePrior = priorTotal > 0 ? (priorRebooked / priorTotal) * 100 : 0;

      const pctChange = (cur: number, prior: number) =>
        prior > 0 ? ((cur - prior) / prior) * 100 : null;

      // ── Staff breakdown ──
      const resolveName = (id: string) => mappingLookup[id]?.name || id;

      const staffBreakdown: StaffExperienceDetail[] = Object.entries(staffMap)
        .filter(([, d]) => d.total > 0)
        .map(([id, d]) => {
          const at = d.total > 0 ? d.tipSum / d.total : 0;
          const tr = d.total > 0 ? (d.tipped / d.total) * 100 : 0;
          const fr = d.total > 0 ? ((feedbackByStaff[id] || 0) / d.total) * 100 : 0;
          const rr = d.total > 0 ? (d.rebooked / d.total) * 100 : 0;
          const cs = computeComposite(tr, rr, fr, at);
          return {
            staffId: id,
            staffName: resolveName(id),
            userId: mappingLookup[id]?.userId || null,
            totalAppointments: d.total,
            avgTip: at,
            tipRate: tr,
            feedbackRate: fr,
            rebookRate: rr,
            compositeScore: Math.round(cs),
            status: getExperienceStatus(cs),
          };
        })
        .sort((a, b) => b.totalAppointments - a.totalAppointments);

      // Salon-wide composite
      const compositeCurrent = computeComposite(tipRateCurrent, rebookRateCurrent, feedbackRateCurrent, avgTipCurrent);
      const compositePrior = computeComposite(tipRatePrior, rebookRatePrior, feedbackRatePrior, avgTipPrior);

      return {
        avgTip: { current: avgTipCurrent, prior: avgTipPrior, percentChange: pctChange(avgTipCurrent, avgTipPrior) },
        tipRate: { current: tipRateCurrent, prior: tipRatePrior, percentChange: pctChange(tipRateCurrent, tipRatePrior) },
        feedbackRate: { current: feedbackRateCurrent, prior: feedbackRatePrior, percentChange: pctChange(feedbackRateCurrent, feedbackRatePrior) },
        rebookRate: { current: rebookRateCurrent, prior: rebookRatePrior, percentChange: pctChange(rebookRateCurrent, rebookRatePrior) },
        compositeScore: { current: Math.round(compositeCurrent), prior: Math.round(compositePrior), percentChange: pctChange(compositeCurrent, compositePrior) },
        staffBreakdown,
        hasNames,
      };
    },
  });
}
