import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useMemo } from 'react';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface AssistantActivitySummary {
  assistantUserId: string;
  assistantName: string;
  photoUrl: string | null;
  totalAssists: number;
  assistedRevenue: number;
  /** Map of lead stylist user_id -> count */
  pairings: Map<string, { name: string; count: number }>;
}

export function useAssistantActivity(dateFrom: string, dateTo: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['assistant-activity', orgId, dateFrom, dateTo],
    queryFn: async () => {
      // Get all assistant assignments in period with appointment dates — server-side date filtering
      // First get appointment IDs in date range
      const apptIds = await fetchAllBatched<{ id: string }>((from, to) =>
        supabase
          .from('v_all_appointments')
          .select('id')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .eq('is_demo', false)
          .range(from, to)
      );

      if (apptIds.length === 0) {
        return { summaries: [], totalAssignments: 0, uniqueAssistants: 0 };
      }

      const ids = apptIds.map(a => a.id);
      // Chunk the .in() call to avoid PostgREST URL length limits
      const CHUNK_SIZE = 500;
      const allAssignments: any[] = [];
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { data: assignments, error } = await supabase
          .from('appointment_assistants')
          .select(`
            assistant_user_id,
            assist_duration_minutes,
            appointment:phorest_appointments!appointment_assistants_appointment_id_fkey(
              appointment_date,
              stylist_user_id,
              start_time,
              end_time,
              total_price,
              tip_amount
            )
          `)
          .eq('organization_id', orgId!)
          .in('appointment_id', chunk);
        if (error) throw error;
        if (assignments) allAssignments.push(...assignments);
      }

      const filtered = allAssignments;

      // Get unique user IDs (assistants + lead stylists)
      const assistantIds = [...new Set(filtered.map(a => a.assistant_user_id))];
      const leadIds = [...new Set(filtered.map(a => (a.appointment as any)?.stylist_user_id).filter(Boolean))];
      const allIds = [...new Set([...assistantIds, ...leadIds])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .in('user_id', allIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const getName = (uid: string) => {
        const p = profileMap.get(uid);
        return p ? formatDisplayName(p.full_name || '', p.display_name) : 'Unknown';
      };

      // Build activity summaries
      const activityMap = new Map<string, {
        totalAssists: number;
        totalMinutes: number;
        assistedRevenue: number;
        pairings: Map<string, { name: string; count: number }>;
      }>();

      for (const assignment of filtered) {
        const aId = assignment.assistant_user_id;
        const appt = assignment.appointment as any;
        const leadId = appt?.stylist_user_id;

        if (!activityMap.has(aId)) {
          activityMap.set(aId, { totalAssists: 0, totalMinutes: 0, assistedRevenue: 0, pairings: new Map() });
        }
        const entry = activityMap.get(aId)!;
        entry.totalAssists++;

        // Assisted revenue
        if (appt?.total_price) {
          entry.assistedRevenue += (Number(appt.total_price) || 0) - (Number(appt.tip_amount) || 0);
        }

        // Duration
        if (assignment.assist_duration_minutes) {
          entry.totalMinutes += assignment.assist_duration_minutes;
        } else if (appt?.start_time && appt?.end_time) {
          const [sh, sm] = appt.start_time.split(':').map(Number);
          const [eh, em] = appt.end_time.split(':').map(Number);
          entry.totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
        }

        // Pairings
        if (leadId) {
          if (!entry.pairings.has(leadId)) {
            entry.pairings.set(leadId, { name: getName(leadId), count: 0 });
          }
          entry.pairings.get(leadId)!.count++;
        }
      }

      return {
        summaries: Array.from(activityMap.entries()).map(([userId, data]) => ({
          assistantUserId: userId,
          assistantName: getName(userId),
          photoUrl: profileMap.get(userId)?.photo_url || null,
          totalAssists: data.totalAssists,
          totalMinutes: data.totalMinutes,
          assistedRevenue: data.assistedRevenue,
          pairings: data.pairings,
        })).sort((a, b) => b.totalAssists - a.totalAssists),
        totalAssignments: filtered.length,
        uniqueAssistants: assistantIds.length,
      };
    },
    enabled: !!orgId,
  });

  return {
    summaries: data?.summaries || [],
    totalAssignments: data?.totalAssignments || 0,
    uniqueAssistants: data?.uniqueAssistants || 0,
    isLoading,
  };
}
