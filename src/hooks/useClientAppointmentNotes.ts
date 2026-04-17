import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';

/**
 * Unified client notes ledger.
 *
 * Returns every `appointment_notes` row attached to *any* appointment that
 * belongs to this client, joined with the appointment's date, service, status,
 * and stylist. This lets the Notes tab become a longitudinal client record
 * rather than a per-appointment scratchpad.
 *
 * Demo IDs short-circuit to an empty ledger — demo notes live in sessionStorage
 * and have no cross-visit join target.
 */
export interface ClientAppointmentNote {
  id: string;
  phorest_appointment_id: string;
  author_id: string;
  note: string;
  is_private: boolean;
  created_at: string;
  author?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
  appointment?: {
    id: string;
    appointment_date: string;
    service_name: string;
    status: string;
    stylist_name: string | null;
  };
}

const isDemoId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

export function useClientAppointmentNotes(
  phorestClientId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && !!phorestClientId && !isDemoId(phorestClientId);

  // Reuse visit history hook for the appointment metadata join.
  const { data: visitHistory = [], isLoading: visitsLoading } = useClientVisitHistory(
    phorestClientId,
    { enabled },
  );

  const visitIds = visitHistory.map((v) => v.id);

  return useQuery({
    queryKey: ['client-appointment-notes', phorestClientId, visitIds.length],
    enabled: enabled && visitIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<ClientAppointmentNote[]> => {
      const { data, error } = await supabase
        .from('appointment_notes')
        .select(`
          *,
          author:employee_profiles!appointment_notes_author_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
        .in('phorest_appointment_id', visitIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Build a lookup of visit metadata for the outcome footer.
      const visitMap = new Map(
        visitHistory.map((v) => [
          v.id,
          {
            id: v.id,
            appointment_date: v.appointment_date,
            service_name: v.service_name,
            status: v.status,
            stylist_name: v.stylist_name,
          },
        ]),
      );

      return (data ?? []).map((row: any) => ({
        ...row,
        appointment: visitMap.get(row.phorest_appointment_id),
      })) as ClientAppointmentNote[];
    },
  });
}
