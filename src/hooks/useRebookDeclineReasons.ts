import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAuditEvent } from '@/hooks/useAppointmentAuditLog';
import { AUDIT_EVENTS } from '@/lib/audit-event-types';

export const REBOOK_DECLINE_REASONS = [
  { code: 'never_asked', label: "I never asked", isLever: true },
  { code: 'client_traveling', label: 'Client declined — traveling / out of town' },
  { code: 'client_call_later', label: 'Client declined — wants to call later' },
  { code: 'client_price', label: 'Client declined — price concern' },
  { code: 'client_schedule_unsure', label: 'Client declined — schedule uncertainty' },
  { code: 'not_applicable', label: "Service doesn't need rebook" },
  { code: 'other', label: 'Other' },
] as const;

export type RebookDeclineReasonCode = (typeof REBOOK_DECLINE_REASONS)[number]['code'];

export function getReasonLabel(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  const match = REBOOK_DECLINE_REASONS.find((r) => r.code === code);
  return match?.label || code;
}

export interface RebookDeclineReasonRow {
  id: string;
  organization_id: string;
  location_id: string | null;
  appointment_id: string | null;
  client_id: string | null;
  staff_id: string | null;
  reason_code: string;
  reason_notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface LogDeclineParams {
  organizationId: string;
  appointmentId: string;
  reasonCode: RebookDeclineReasonCode;
  reasonNotes?: string | null;
  locationId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
}

export function useLogRebookDeclineReason() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logAudit = useLogAuditEvent();

  return useMutation({
    mutationFn: async (params: LogDeclineParams) => {
      const { error } = await supabase
        .from('rebook_decline_reasons' as any)
        .insert({
          organization_id: params.organizationId,
          location_id: params.locationId ?? null,
          appointment_id: params.appointmentId,
          client_id: params.clientId ?? null,
          staff_id: params.staffId ?? null,
          reason_code: params.reasonCode,
          reason_notes: params.reasonNotes ?? null,
          created_by: user?.id ?? null,
        } as any);
      if (error) throw error;

      // Mirror to appointment_audit_log for backward-compat with rebook audit queries
      await logAudit.mutateAsync({
        appointmentId: params.appointmentId,
        organizationId: params.organizationId,
        eventType: AUDIT_EVENTS.REBOOK_DECLINED,
        metadata: {
          reason_code: params.reasonCode,
          reason_label: getReasonLabel(params.reasonCode),
          reason_notes: params.reasonNotes ?? null,
        },
      });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rebook-decline-reasons', vars.organizationId] });
    },
  });
}

interface UseDeclineReasonsParams {
  organizationId?: string;
  locationId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function useRebookDeclineReasons({
  organizationId,
  locationId,
  dateFrom,
  dateTo,
}: UseDeclineReasonsParams) {
  return useQuery({
    queryKey: ['rebook-decline-reasons', organizationId, locationId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from('rebook_decline_reasons' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });
      if (locationId) q = q.eq('location_id', locationId);
      if (dateFrom) q = q.gte('created_at', `${dateFrom}T00:00:00Z`);
      if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59Z`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RebookDeclineReasonRow[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}
