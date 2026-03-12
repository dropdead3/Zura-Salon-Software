/**
 * useAssistantDailyPrep — Fetches today's appointments requiring color/chemical mixing.
 * Cross-references with existing mix sessions to show prep status.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';

export interface DailyPrepItem {
  appointmentId: string;
  startTime: string;
  serviceName: string;
  clientName: string;
  clientId: string | null;
  staffUserId: string | null;
  staffName: string | null;
  locationId: string | null;
  hasExistingSession: boolean;
  sessionStatus: string | null;
}

const COLOR_SERVICE_CATEGORIES = ['color', 'colour', 'chemical', 'highlight', 'balayage', 'lightener', 'toner', 'gloss'];

function isColorService(serviceName: string | null, serviceCategory: string | null): boolean {
  if (!serviceName && !serviceCategory) return false;
  const combined = `${serviceName ?? ''} ${serviceCategory ?? ''}`.toLowerCase();
  return COLOR_SERVICE_CATEGORIES.some((cat) => combined.includes(cat));
}

export function useAssistantDailyPrep(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery<DailyPrepItem[]>({
    queryKey: ['assistant-daily-prep', orgId, locationId, today],
    queryFn: async () => {
      // Fetch today's appointments
      const query = supabase
        .from('appointments')
        .select('id, start_time, service_name, service_category, client_name, client_id, staff_user_id, staff_name, location_id')
        .eq('organization_id', orgId!)
        .eq('appointment_date', today)
        .not('status', 'in', '("cancelled","no_show")')
        .order('start_time', { ascending: true });

      if (locationId) {
        query.eq('location_id', locationId);
      }

      const { data: appointments, error: apptError } = await query;
      if (apptError) throw apptError;

      // Filter to color/chemical services
      const colorAppointments = (appointments ?? []).filter((a: any) =>
        isColorService(a.service_name, a.service_category)
      );

      if (colorAppointments.length === 0) return [];

      // Check for existing mix sessions
      const appointmentIds = colorAppointments.map((a: any) => a.id);
      const { data: sessions, error: sessionError } = await supabase
        .from('mix_sessions')
        .select('appointment_id, status')
        .eq('organization_id', orgId!)
        .in('appointment_id', appointmentIds);

      if (sessionError) throw sessionError;

      const sessionMap = new Map<string, string>();
      (sessions ?? []).forEach((s: any) => {
        sessionMap.set(s.appointment_id, s.status);
      });

      return colorAppointments.map((a: any) => ({
        appointmentId: a.id,
        startTime: a.start_time,
        serviceName: a.service_name ?? 'Color Service',
        clientName: a.client_name ?? 'Unknown Client',
        clientId: a.client_id,
        staffUserId: a.staff_user_id,
        staffName: a.staff_name,
        locationId: a.location_id,
        hasExistingSession: sessionMap.has(a.id),
        sessionStatus: sessionMap.get(a.id) ?? null,
      }));
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
