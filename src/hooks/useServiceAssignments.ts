import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceAssignment {
  id: string;
  service_name: string;
  assigned_user_id: string;
  assigned_staff_name: string;
  start_time_offset_minutes: number | null;
  duration_minutes_override: number | null;
  price_override: number | null;
  requires_consultation: boolean;
}

export interface ServiceAssignmentInput {
  serviceName: string;
  userId: string;
  staffName: string;
  startTimeOffsetMinutes?: number | null;
  durationMinutesOverride?: number | null;
  priceOverride?: number | null;
  requiresConsultation?: boolean;
}

/**
 * Fetches per-service overrides for an appointment (stylist, time, duration, price, RQ).
 * Returns a Map<serviceName, ServiceAssignment> for easy lookup.
 *
 * Demo appointments (`demo-*` IDs) read overrides from sessionStorage.
 */
export function useServiceAssignments(appointmentId: string | null) {
  const queryClient = useQueryClient();

  const { data: assignmentMap = new Map<string, ServiceAssignment>(), isLoading } = useQuery({
    queryKey: ['service-assignments', appointmentId],
    queryFn: async () => {
      const map = new Map<string, ServiceAssignment>();

      // Demo mode — read overrides from sessionStorage
      if (appointmentId?.startsWith('demo-')) {
        try {
          const raw = sessionStorage.getItem(`service-overrides::${appointmentId}`);
          if (raw) {
            const arr = JSON.parse(raw) as ServiceAssignment[];
            for (const row of arr) map.set(row.service_name, row);
          }
        } catch {}
        return map;
      }

      const { data, error } = await supabase
        .from('appointment_service_assignments')
        .select('id, service_name, assigned_user_id, assigned_staff_name, start_time_offset_minutes, duration_minutes_override, price_override, requires_consultation')
        .eq('appointment_id', appointmentId!);
      if (error) throw error;

      for (const row of (data as any[]) || []) {
        map.set(row.service_name, {
          id: row.id,
          service_name: row.service_name,
          assigned_user_id: row.assigned_user_id,
          assigned_staff_name: row.assigned_staff_name,
          start_time_offset_minutes: row.start_time_offset_minutes,
          duration_minutes_override: row.duration_minutes_override,
          price_override: row.price_override,
          requires_consultation: !!row.requires_consultation,
        });
      }
      return map;
    },
    enabled: !!appointmentId,
    staleTime: 30_000,
  });

  const upsertAssignments = useMutation({
    mutationFn: async (params: {
      appointmentId: string;
      organizationId: string;
      assignments: ServiceAssignmentInput[];
    }) => {
      // Demo mode — persist to sessionStorage
      if (params.appointmentId.startsWith('demo-')) {
        const key = `service-overrides::${params.appointmentId}`;
        const existing = (() => {
          try {
            return JSON.parse(sessionStorage.getItem(key) || '[]') as ServiceAssignment[];
          } catch { return []; }
        })();
        const map = new Map<string, ServiceAssignment>(existing.map(r => [r.service_name, r]));
        for (const a of params.assignments) {
          map.set(a.serviceName, {
            id: map.get(a.serviceName)?.id || `demo-${Math.random().toString(36).slice(2)}`,
            service_name: a.serviceName,
            assigned_user_id: a.userId,
            assigned_staff_name: a.staffName,
            start_time_offset_minutes: a.startTimeOffsetMinutes ?? null,
            duration_minutes_override: a.durationMinutesOverride ?? null,
            price_override: a.priceOverride ?? null,
            requires_consultation: a.requiresConsultation ?? false,
          });
        }
        sessionStorage.setItem(key, JSON.stringify(Array.from(map.values())));
        return;
      }

      const rows = params.assignments.map(a => ({
        appointment_id: params.appointmentId,
        service_name: a.serviceName,
        assigned_user_id: a.userId,
        assigned_staff_name: a.staffName,
        organization_id: params.organizationId,
        start_time_offset_minutes: a.startTimeOffsetMinutes ?? null,
        duration_minutes_override: a.durationMinutesOverride ?? null,
        price_override: a.priceOverride ?? null,
        requires_consultation: a.requiresConsultation ?? false,
      }));

      const { error } = await supabase
        .from('appointment_service_assignments')
        .upsert(rows as any, { onConflict: 'appointment_id,service_name' });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-assignments', variables.appointmentId] });
    },
  });

  return { assignmentMap, isLoading, upsertAssignments };
}
