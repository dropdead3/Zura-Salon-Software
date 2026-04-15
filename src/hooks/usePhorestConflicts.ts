import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface PhorestConflict {
  requestId: string;
  appointmentId: string;
  stylistUserId: string;
  date: string;
  requestStartTime: string;
  requestEndTime: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  appointmentClientName: string;
  appointmentServiceName: string;
}

interface AssistantRequest {
  id: string;
  stylist_id: string;
  request_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface PhorestAppointment {
  id: string | null;
  stylist_user_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string | null;
  service_name: string | null;
  status: string;
}

/**
 * Detects conflicts between assistant requests and Phorest appointments
 * for the same stylist on the same date with overlapping times
 */
export function usePhorestRequestConflicts(requests: AssistantRequest[]) {
  // Get unique dates and stylist IDs from active requests
  const activeRequests = useMemo(() => 
    requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled'),
    [requests]
  );

  const dates = useMemo(() => 
    [...new Set(activeRequests.map(r => r.request_date))],
    [activeRequests]
  );

  const stylistIds = useMemo(() => 
    [...new Set(activeRequests.map(r => r.stylist_id))],
    [activeRequests]
  );

  // Fetch Phorest appointments for these dates and stylists
  const { data: phorestAppointments } = useQuery({
    queryKey: ['phorest-conflict-appointments', dates, stylistIds],
    queryFn: async () => {
      if (dates.length === 0 || stylistIds.length === 0) return [];

      const { data, error } = await supabase
        .from('v_all_appointments' as any)
        .select('id, stylist_user_id, appointment_date, start_time, end_time, client_name, service_name, status')
        .in('appointment_date', dates)
        .in('stylist_user_id', stylistIds)
        .neq('status', 'cancelled');

      if (error) throw error;
      return data as unknown as PhorestAppointment[];
    },
    enabled: dates.length > 0 && stylistIds.length > 0,
  });

  // Detect conflicts
  const conflicts = useMemo<PhorestConflict[]>(() => {
    if (!phorestAppointments || phorestAppointments.length === 0) return [];

    const conflictList: PhorestConflict[] = [];

    for (const request of activeRequests) {
      // Find appointments for this stylist on this date
      const relevantAppointments = phorestAppointments.filter(
        apt => apt.stylist_user_id === request.stylist_id && 
               apt.appointment_date === request.request_date
      );

      for (const apt of relevantAppointments) {
        // Check for time overlap
        // Overlap exists if: requestStart < aptEnd AND requestEnd > aptStart
        if (request.start_time < apt.end_time && request.end_time > apt.start_time) {
          conflictList.push({
            requestId: request.id,
            appointmentId: apt.id || '',
            stylistUserId: request.stylist_id,
            date: request.request_date,
            requestStartTime: request.start_time,
            requestEndTime: request.end_time,
            appointmentStartTime: apt.start_time,
            appointmentEndTime: apt.end_time,
            appointmentClientName: apt.client_name || 'Unknown Client',
            appointmentServiceName: apt.service_name || 'Unknown Service',
          });
        }
      }
    }

    return conflictList;
  }, [activeRequests, phorestAppointments]);

  // Group conflicts by request ID for easy lookup
  const conflictsByRequest = useMemo(() => {
    const map = new Map<string, PhorestConflict[]>();
    for (const conflict of conflicts) {
      const existing = map.get(conflict.requestId) || [];
      existing.push(conflict);
      map.set(conflict.requestId, existing);
    }
    return map;
  }, [conflicts]);

  return {
    conflicts,
    conflictsByRequest,
    hasConflicts: conflicts.length > 0,
    getConflictsForRequest: (requestId: string) => conflictsByRequest.get(requestId) || [],
  };
}
