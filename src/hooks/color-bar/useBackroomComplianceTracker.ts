/**
 * useBackroomComplianceTracker — Reads backroom_compliance_log for a date range.
 * Returns individual items + aggregated summary stats + per-staff breakdown.
 * Enhanced with waste metrics + overage attachment rate.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface ComplianceLogItem {
  id: string;
  appointmentId: string;
  appointmentDate: string;
  locationId: string | null;
  staffUserId: string | null;
  staffName: string | null;
  serviceName: string | null;
  hasMixSession: boolean;
  mixSessionId: string | null;
  hasReweigh: boolean;
  isManualOverride: boolean;
  complianceStatus: 'compliant' | 'partial' | 'missing';
  notes: string | null;
  evaluatedAt: string;
}

export interface ComplianceSummary {
  totalColorAppointments: number;
  compliant: number;
  partial: number;
  missing: number;
  complianceRate: number;
  reweighRate: number;
  manualOverrideCount: number;
  /** Total waste quantity (grams) from waste_events */
  wasteQty: number;
  /** Estimated waste cost ($) */
  wasteCost: number;
  /** Waste as % of total dispensed */
  wastePct: number;
  /** % of color appointments that generated an overage charge */
  overageAttachmentRate: number;
  /** Total overage charges ($) */
  overageChargeTotal: number;
}

export interface StaffComplianceBreakdown {
  staffUserId: string;
  staffName: string;
  total: number;
  compliant: number;
  partial: number;
  missing: number;
  complianceRate: number;
  wasteQty: number;
  wastePct: number;
  wasteCost: number;
}

export interface ComplianceTrendPoint {
  date: string;
  complianceRate: number;
  wastePct: number;
  total: number;
}

export interface ComplianceTrackerResult {
  items: ComplianceLogItem[];
  summary: ComplianceSummary;
  staffBreakdown: StaffComplianceBreakdown[];
  trend: ComplianceTrendPoint[];
}

export function useBackroomComplianceTracker(
  dateFrom: string,
  dateTo: string,
  locationId?: string,
  staffUserId?: string,
) {
  const orgId = useBackroomOrgId();

  return useQuery<ComplianceTrackerResult>({
    queryKey: ['backroom-compliance-tracker', orgId, dateFrom, dateTo, locationId, staffUserId],
    queryFn: async () => {
      let query = supabase
        .from('backroom_compliance_log')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .order('appointment_date', { ascending: true });

      if (locationId) query = query.eq('location_id', locationId);
      if (staffUserId) query = query.eq('staff_user_id', staffUserId);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as any[];

      const items: ComplianceLogItem[] = rows.map((r) => ({
        id: r.id,
        appointmentId: r.appointment_id,
        appointmentDate: r.appointment_date,
        locationId: r.location_id,
        staffUserId: r.staff_user_id,
        staffName: r.staff_name,
        serviceName: r.service_name,
        hasMixSession: r.has_mix_session,
        mixSessionId: r.mix_session_id,
        hasReweigh: r.has_reweigh,
        isManualOverride: r.is_manual_override,
        complianceStatus: r.compliance_status,
        notes: r.notes,
        evaluatedAt: r.evaluated_at,
      }));

      // --- Fetch waste events for sessions in range ---
      const sessionIds = items
        .filter((i) => i.mixSessionId)
        .map((i) => i.mixSessionId!);

      let wasteRows: any[] = [];
      if (sessionIds.length > 0) {
        // Batch in chunks of 200 to avoid query size limits
        for (let i = 0; i < sessionIds.length; i += 200) {
          const chunk = sessionIds.slice(i, i + 200);
          const { data: wd } = await supabase
            .from('waste_events')
            .select('mix_session_id, quantity, unit')
            .in('mix_session_id', chunk);
          if (wd) wasteRows.push(...wd);
        }
      }

      // Build per-session waste map
      const sessionWasteMap = new Map<string, number>();
      for (const w of wasteRows) {
        const prev = sessionWasteMap.get(w.mix_session_id) ?? 0;
        sessionWasteMap.set(w.mix_session_id, prev + (w.quantity ?? 0));
      }

      // --- Fetch backroom analytics snapshot for dispensed totals & cost ---
      let totalDispensedQty = 0;
      let totalProductCost = 0;
      {
        let snapQuery = supabase
          .from('backroom_analytics_snapshots')
          .select('total_dispensed_qty, total_product_cost, total_waste_qty, waste_pct')
          .eq('organization_id', orgId!)
          .gte('snapshot_date', dateFrom)
          .lte('snapshot_date', dateTo);
        if (locationId) snapQuery = snapQuery.eq('location_id', locationId);
        const { data: snapRows } = await snapQuery;
        for (const s of snapRows ?? []) {
          totalDispensedQty += (s as any).total_dispensed_qty ?? 0;
          totalProductCost += (s as any).total_product_cost ?? 0;
        }
      }

      const totalWasteQty = Array.from(sessionWasteMap.values()).reduce((a, b) => a + b, 0);
      const wastePct = totalDispensedQty > 0
        ? Math.round((totalWasteQty / totalDispensedQty) * 1000) / 10
        : 0;
      const costPerGram = totalDispensedQty > 0 ? totalProductCost / totalDispensedQty : 0;
      const wasteCost = Math.round(totalWasteQty * costPerGram * 100) / 100;

      // --- Fetch overage charges ---
      const appointmentIds = items.map((i) => i.appointmentId);
      let overageChargeTotal = 0;
      let appointmentsWithOverage = 0;
      if (appointmentIds.length > 0) {
        for (let i = 0; i < appointmentIds.length; i += 200) {
          const chunk = appointmentIds.slice(i, i + 200);
          const { data: charges } = await supabase
            .from('checkout_usage_charges')
            .select('appointment_id, charge_amount')
            .in('appointment_id', chunk);
          if (charges) {
            const seen = new Set<string>();
            for (const c of charges) {
              overageChargeTotal += (c as any).charge_amount ?? 0;
              if (!seen.has((c as any).appointment_id)) {
                seen.add((c as any).appointment_id);
                appointmentsWithOverage++;
              }
            }
          }
        }
      }

      const total = items.length;
      const compliant = items.filter((i) => i.complianceStatus === 'compliant').length;
      const partial = items.filter((i) => i.complianceStatus === 'partial').length;
      const missing = items.filter((i) => i.complianceStatus === 'missing').length;
      const reweighEligible = items.filter((i) => i.hasMixSession).length;
      const reweighed = items.filter((i) => i.hasReweigh).length;

      const overageAttachmentRate = total > 0
        ? Math.round((appointmentsWithOverage / total) * 100)
        : 0;

      const summary: ComplianceSummary = {
        totalColorAppointments: total,
        compliant,
        partial,
        missing,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
        reweighRate: reweighEligible > 0 ? Math.round((reweighed / reweighEligible) * 100) : 0,
        manualOverrideCount: items.filter((i) => i.isManualOverride).length,
        wasteQty: Math.round(totalWasteQty * 10) / 10,
        wasteCost,
        wastePct,
        overageAttachmentRate,
        overageChargeTotal: Math.round(overageChargeTotal * 100) / 100,
      };

      // Per-staff breakdown with waste
      const staffMap = new Map<string, {
        name: string; total: number; compliant: number; partial: number; missing: number;
        wasteQty: number; sessionIds: string[];
      }>();
      items.forEach((i) => {
        const key = i.staffUserId ?? 'unknown';
        if (!staffMap.has(key)) {
          staffMap.set(key, {
            name: i.staffName ?? 'Unknown', total: 0, compliant: 0, partial: 0, missing: 0,
            wasteQty: 0, sessionIds: [],
          });
        }
        const s = staffMap.get(key)!;
        s.total++;
        if (i.complianceStatus === 'compliant') s.compliant++;
        else if (i.complianceStatus === 'partial') s.partial++;
        else s.missing++;
        if (i.mixSessionId) {
          s.sessionIds.push(i.mixSessionId);
          s.wasteQty += sessionWasteMap.get(i.mixSessionId) ?? 0;
        }
      });

      const staffBreakdown: StaffComplianceBreakdown[] = Array.from(staffMap.entries())
        .map(([staffUid, s]) => ({
          staffUserId: staffUid,
          staffName: s.name,
          total: s.total,
          compliant: s.compliant,
          partial: s.partial,
          missing: s.missing,
          complianceRate: s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0,
          wasteQty: Math.round(s.wasteQty * 10) / 10,
          wastePct: totalDispensedQty > 0 && s.total > 0
            ? Math.round((s.wasteQty / (totalDispensedQty * (s.total / total))) * 1000) / 10
            : 0,
          wasteCost: Math.round(s.wasteQty * costPerGram * 100) / 100,
        }))
        .sort((a, b) => a.complianceRate - b.complianceRate);

      // Daily trend with waste %
      const dateMap = new Map<string, { total: number; compliant: number; wasteQty: number }>();
      items.forEach((i) => {
        if (!dateMap.has(i.appointmentDate)) dateMap.set(i.appointmentDate, { total: 0, compliant: 0, wasteQty: 0 });
        const d = dateMap.get(i.appointmentDate)!;
        d.total++;
        if (i.complianceStatus === 'compliant') d.compliant++;
        if (i.mixSessionId) d.wasteQty += sessionWasteMap.get(i.mixSessionId) ?? 0;
      });

      const trend: ComplianceTrendPoint[] = Array.from(dateMap.entries())
        .map(([date, d]) => ({
          date,
          complianceRate: d.total > 0 ? Math.round((d.compliant / d.total) * 100) : 0,
          wastePct: totalDispensedQty > 0 && d.total > 0
            ? Math.round((d.wasteQty / (totalDispensedQty * (d.total / total))) * 1000) / 10
            : 0,
          total: d.total,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { items, summary, staffBreakdown, trend };
    },
    enabled: !!orgId && !!dateFrom && !!dateTo,
    staleTime: 60_000,
  });
}
