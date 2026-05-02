/**
 * useServiceSatisfaction — Aggregates client_feedback_responses by service_name
 * via the linked appointment. Suppresses services with < 5 responses.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

const MIN_RESPONSES = 5;

export interface ServiceSatisfactionRow {
  serviceName: string;
  responseCount: number;
  avgRating: number;
  nps: number;
}

export function useServiceSatisfaction(days: number = 30) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-satisfaction', orgId, days],
    queryFn: async (): Promise<ServiceSatisfactionRow[]> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const rows = await fetchAllBatched<{
        appointment_id: string | null;
        overall_rating: number | null;
        nps_score: number | null;
      }>((from, to) =>
        supabase
          .from('client_feedback_responses')
          .select('appointment_id, overall_rating, nps_score')
          .eq('organization_id', orgId!)
          .gte('responded_at', since)
          .not('appointment_id', 'is', null)
          .range(from, to),
      );

      const apptIds = Array.from(new Set(rows.map((r) => r.appointment_id).filter(Boolean) as string[]));
      if (apptIds.length === 0) return [];

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, service_name')
        .in('id', apptIds);

      const serviceMap = new Map((appts ?? []).map((a) => [a.id, a.service_name || 'Unspecified']));
      const buckets = new Map<string, { ratings: number[]; nps: number[] }>();

      for (const r of rows) {
        const svc = serviceMap.get(r.appointment_id || '') || 'Unspecified';
        const b = buckets.get(svc) ?? { ratings: [], nps: [] };
        if (r.overall_rating != null) b.ratings.push(r.overall_rating);
        if (r.nps_score != null) b.nps.push(r.nps_score);
        buckets.set(svc, b);
      }

      const out: ServiceSatisfactionRow[] = [];
      for (const [serviceName, b] of buckets) {
        if (b.ratings.length < MIN_RESPONSES) continue;
        const promoters = b.nps.filter((s) => s >= 9).length;
        const detractors = b.nps.filter((s) => s <= 6).length;
        out.push({
          serviceName,
          responseCount: b.ratings.length,
          avgRating: b.ratings.reduce((s, v) => s + v, 0) / b.ratings.length,
          nps: b.nps.length > 0 ? Math.round(((promoters - detractors) / b.nps.length) * 100) : 0,
        });
      }

      return out.sort((a, b) => b.avgRating - a.avgRating);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
