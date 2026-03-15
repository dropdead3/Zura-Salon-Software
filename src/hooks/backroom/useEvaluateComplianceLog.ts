/**
 * useEvaluateComplianceLog — Mutation hook that cross-references
 * completed color/chemical appointments against mix_sessions for a given date
 * and upserts results into backroom_compliance_log.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';
import { toast } from 'sonner';

export function useEvaluateComplianceLog() {
  const orgId = useBackroomOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, locationId }: { date: string; locationId?: string }) => {
      if (!orgId) throw new Error('Organization not resolved');

      // 1. Fetch completed color/chemical appointments for the date
      let apptQuery = supabase
        .from('appointments')
        .select('id, appointment_date, location_id, staff_user_id, staff_name, service_name, service_category')
        .eq('organization_id', orgId)
        .eq('appointment_date', date)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId) apptQuery = apptQuery.eq('location_id', locationId);

      const { data: appointments, error: apptErr } = await apptQuery;
      if (apptErr) throw apptErr;

      const colorAppts = (appointments ?? []).filter((a: any) =>
        isColorOrChemicalService(a.service_name, a.service_category),
      );

      if (colorAppts.length === 0) return { evaluated: 0, compliant: 0, missing: 0 };

      const apptIds = colorAppts.map((a: any) => a.id);

      // 2. Fetch matching mix_sessions
      const { data: sessions, error: sessErr } = await supabase
        .from('mix_sessions')
        .select('id, appointment_id, status')
        .eq('organization_id', orgId)
        .in('appointment_id', apptIds);
      if (sessErr) throw sessErr;

      const sessionByAppt = new Map<string, { id: string; status: string }>();
      (sessions ?? []).forEach((s: any) => {
        sessionByAppt.set(s.appointment_id, { id: s.id, status: s.status });
      });

      // 3. For sessions that exist, check mix_bowls for reweigh
      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      const reweighSet = new Set<string>();
      const manualOverrideSet = new Set<string>();

      if (sessionIds.length > 0) {
        const { data: bowls } = await (supabase
          .from('mix_bowls' as any)
          .select('session_id, post_service_weight_g, is_manual_override')
          .in('session_id', sessionIds));

        (bowls ?? []).forEach((b: any) => {
          if (b.post_service_weight_g != null && b.post_service_weight_g > 0) {
            reweighSet.add(b.session_id);
          }
          if (b.is_manual_override) {
            manualOverrideSet.add(b.session_id);
          }
        });
      }

      // 4. Build upsert rows
      const rows = colorAppts.map((a: any) => {
        const session = sessionByAppt.get(a.id);
        const hasMix = !!session;
        const hasReweigh = session ? reweighSet.has(session.id) : false;
        const isManual = session ? manualOverrideSet.has(session.id) : false;

        let status: string;
        if (hasMix && hasReweigh) status = 'compliant';
        else if (hasMix && !hasReweigh) status = 'partial';
        else status = 'missing';

        return {
          organization_id: orgId,
          appointment_id: a.id,
          appointment_date: a.appointment_date,
          location_id: a.location_id,
          staff_user_id: a.staff_user_id,
          staff_name: a.staff_name,
          service_name: a.service_name,
          has_mix_session: hasMix,
          mix_session_id: session?.id ?? null,
          has_reweigh: hasReweigh,
          is_manual_override: isManual,
          compliance_status: status,
          evaluated_at: new Date().toISOString(),
        };
      });

      // 5. Upsert
      const { error: upsertErr } = await supabase
        .from('backroom_compliance_log')
        .upsert(rows, { onConflict: 'appointment_id' });
      if (upsertErr) throw upsertErr;

      const compliant = rows.filter((r) => r.compliance_status === 'compliant').length;
      const missing = rows.filter((r) => r.compliance_status === 'missing').length;

      return { evaluated: rows.length, compliant, missing };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['backroom-compliance-tracker'] });
      toast.success(`Evaluated ${result.evaluated} color appointments: ${result.compliant} compliant, ${result.missing} missing`);
    },
    onError: (err) => {
      toast.error('Failed to evaluate compliance: ' + (err as Error).message);
    },
  });
}
