/**
 * useStaffComplianceSummary — Lightweight hook to fetch compliance stats
 * for a single staff member over a date range.
 * Used by Individual Staff Report and 1:1 Report Builder.
 * Enhanced with waste metrics + overage attachment rate.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';

export interface StaffComplianceSummary {
  complianceRate: number;
  totalColorAppointments: number;
  tracked: number;
  missed: number;
  reweighRate: number;
  manualOverrides: number;
  missedAppointments: {
    appointmentId: string;
    date: string;
    serviceName: string;
    startTime: string;
  }[];
  /** Total waste quantity (grams) */
  wasteQty: number;
  /** Waste as % of dispensed */
  wastePct: number;
  /** Estimated waste cost ($) */
  wasteCost: number;
  /** % of color appointments with overage charge */
  overageAttachmentRate: number;
  /** Total overage charges ($) */
  overageChargeTotal: number;
}

/**
 * @param staffUserId - the staff member to query
 * @param dateFrom - YYYY-MM-DD
 * @param dateTo - YYYY-MM-DD
 * @param orgId - optional org ID; if omitted, resolved from staff's employee_profile
 */
export function useStaffComplianceSummary(
  staffUserId: string | null,
  dateFrom?: string,
  dateTo?: string,
  orgId?: string,
) {
  return useQuery<StaffComplianceSummary | null>({
    queryKey: ['staff-compliance-summary', staffUserId, dateFrom, dateTo, orgId],
    queryFn: async () => {
      if (!staffUserId || !dateFrom || !dateTo) return null;

      // Resolve org if not provided
      let resolvedOrg = orgId;
      if (!resolvedOrg) {
        const { data: ep } = await supabase
          .from('employee_profiles')
          .select('organization_id')
          .eq('user_id', staffUserId)
          .maybeSingle();
        resolvedOrg = (ep as any)?.organization_id ?? undefined;
      }
      if (!resolvedOrg) return null;

      // --- Query BOTH appointment tables for color/chemical services ---

      // 1. Local appointments table
      const { data: localAppts } = await supabase
        .from('appointments')
        .select('id, appointment_date, service_name, service_category, start_time')
        .eq('organization_id', resolvedOrg)
        .eq('staff_user_id', staffUserId)
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      const localColorAppts = (localAppts ?? []).filter((a: any) =>
        isColorOrChemicalService(a.service_name, a.service_category),
      );

      // 2. Phorest appointments table (primary source for Phorest-integrated salons)
      // Look up staff's phorest_staff_id first
      let phorestColorAppts: any[] = [];
      {
        const { data: ep } = await supabase
          .from('employee_profiles')
          .select('phorest_staff_id')
          .eq('user_id', staffUserId)
          .maybeSingle();
        const phorestStaffId = (ep as any)?.phorest_staff_id;

        if (phorestStaffId) {
          const { data: pAppts } = await supabase
            .from('phorest_appointments')
            .select('id, appointment_date, service_name, start_time')
            .eq('organization_id', resolvedOrg)
            .eq('staff_id', phorestStaffId)
            .gte('appointment_date', dateFrom)
            .lte('appointment_date', dateTo)
            .not('status', 'in', '("cancelled","no_show")');

          phorestColorAppts = (pAppts ?? []).filter((a: any) =>
            isColorOrChemicalService(a.service_name, null),
          );
        }
      }

      // Merge — use whichever source has more color appointments (avoid double-counting)
      const colorAppts = phorestColorAppts.length >= localColorAppts.length
        ? phorestColorAppts
        : localColorAppts;

      if (colorAppts.length === 0) {
        return {
          complianceRate: 100,
          totalColorAppointments: 0,
          tracked: 0,
          missed: 0,
          reweighRate: 100,
          manualOverrides: 0,
          missedAppointments: [],
          wasteQty: 0,
          wastePct: 0,
          wasteCost: 0,
          overageAttachmentRate: 0,
          overageChargeTotal: 0,
        };
      }

      // Merge IDs from both tables for cross-referencing mix_sessions
      const allApptIds = [
        ...new Set([
          ...localColorAppts.map((a: any) => a.id),
          ...phorestColorAppts.map((a: any) => a.id),
        ]),
      ].filter(Boolean);
      const apptIds = colorAppts.map((a: any) => a.id);

      // Cross-reference with mix_sessions
      const { data: sessions } = await supabase
        .from('mix_sessions')
        .select('id, appointment_id')
        .eq('organization_id', resolvedOrg)
        .in('appointment_id', apptIds);

      const sessionApptSet = new Set((sessions ?? []).map((s: any) => s.appointment_id));
      const sessionIds = (sessions ?? []).map((s: any) => s.id);

      // Check reweighs
      let reweighCount = 0;
      let manualOverrides = 0;
      if (sessionIds.length > 0) {
        const { data: bowlData } = await (supabase
          .from('mix_bowls')
          .select('session_id, post_service_weight_g, is_manual_override') as any)
          .in('session_id', sessionIds);

        const reweighSessions = new Set<string>();
        (bowlData ?? []).forEach((b: any) => {
          if (b.post_service_weight_g != null && b.post_service_weight_g > 0) {
            reweighSessions.add(b.session_id);
          }
          if (b.is_manual_override) manualOverrides++;
        });
        reweighCount = reweighSessions.size;
      }

      // --- Waste events for this staff's sessions ---
      let totalWasteQty = 0;
      if (sessionIds.length > 0) {
        const { data: wasteData } = await supabase
          .from('waste_events')
          .select('quantity')
          .in('mix_session_id', sessionIds);
        for (const w of wasteData ?? []) {
          totalWasteQty += (w as any).quantity ?? 0;
        }
      }

      // Get dispensed weight from staff_backroom_performance for waste %
      let totalDispensed = 0;
      let totalCost = 0;
      {
        const { data: perfData } = await supabase
          .from('staff_backroom_performance')
          .select('total_dispensed_weight, total_product_cost')
          .eq('organization_id', resolvedOrg)
          .eq('staff_id', staffUserId)
          .gte('period_start', dateFrom)
          .lte('period_end', dateTo);
        for (const p of perfData ?? []) {
          totalDispensed += (p as any).total_dispensed_weight ?? 0;
          totalCost += (p as any).total_product_cost ?? 0;
        }
      }

      const wastePct = totalDispensed > 0
        ? Math.round((totalWasteQty / totalDispensed) * 1000) / 10
        : 0;
      const costPerGram = totalDispensed > 0 ? totalCost / totalDispensed : 0;
      const wasteCost = Math.round(totalWasteQty * costPerGram * 100) / 100;

      // --- Overage charges for this staff's appointments ---
      let overageChargeTotal = 0;
      let appointmentsWithOverage = 0;
      if (apptIds.length > 0) {
        const { data: charges } = await supabase
          .from('checkout_usage_charges')
          .select('appointment_id, charge_amount')
          .in('appointment_id', apptIds);
        const seen = new Set<string>();
        for (const c of charges ?? []) {
          overageChargeTotal += (c as any).charge_amount ?? 0;
          if (!seen.has((c as any).appointment_id)) {
            seen.add((c as any).appointment_id);
            appointmentsWithOverage++;
          }
        }
      }

      const tracked = sessionApptSet.size;
      const missed = colorAppts.length - tracked;

      const missedAppointments = colorAppts
        .filter((a: any) => !sessionApptSet.has(a.id))
        .slice(0, 5)
        .map((a: any) => ({
          appointmentId: a.id,
          date: a.appointment_date,
          serviceName: a.service_name ?? 'Color Service',
          startTime: a.start_time ?? '',
        }));

      return {
        complianceRate: colorAppts.length > 0 ? Math.round((tracked / colorAppts.length) * 100) : 100,
        totalColorAppointments: colorAppts.length,
        tracked,
        missed,
        reweighRate: tracked > 0 ? Math.round((reweighCount / tracked) * 100) : 100,
        manualOverrides,
        missedAppointments,
        wasteQty: Math.round(totalWasteQty * 10) / 10,
        wastePct,
        wasteCost,
        overageAttachmentRate: colorAppts.length > 0
          ? Math.round((appointmentsWithOverage / colorAppts.length) * 100)
          : 0,
        overageChargeTotal: Math.round(overageChargeTotal * 100) / 100,
      };
    },
    enabled: !!staffUserId && !!dateFrom && !!dateTo,
    staleTime: 5 * 60_000,
  });
}
