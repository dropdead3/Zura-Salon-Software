/**
 * useStaffComplianceSummary — Lightweight hook to fetch compliance stats
 * for a single staff member over a date range.
 * Used by Individual Staff Report and 1:1 Report Builder.
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

      // Fetch color/chemical appointments for this staff member
      const { data: appointments, error: apptErr } = await supabase
        .from('appointments')
        .select('id, appointment_date, service_name, service_category, start_time')
        .eq('organization_id', resolvedOrg)
        .eq('staff_user_id', staffUserId)
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      if (apptErr) throw apptErr;

      const colorAppts = (appointments ?? []).filter((a: any) =>
        isColorOrChemicalService(a.service_name, a.service_category),
      );

      if (colorAppts.length === 0) {
        return {
          complianceRate: 100,
          totalColorAppointments: 0,
          tracked: 0,
          missed: 0,
          reweighRate: 100,
          manualOverrides: 0,
          missedAppointments: [],
        };
      }

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
        const { data: bowlData } = await supabase
          .from('mix_bowls')
          .select('session_id, post_service_weight_g, is_manual_override')
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
      };
    },
    enabled: !!staffUserId && !!dateFrom && !!dateTo,
    staleTime: 5 * 60_000,
  });
}
