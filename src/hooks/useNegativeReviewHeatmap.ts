/**
 * useNegativeReviewHeatmap — Aggregates low-rated feedback (rating <= 3 OR
 * NPS <= 6) by location × service. Suppresses cells with < 3 responses
 * (signal preservation doctrine).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

const MIN_RESPONSES_PER_CELL = 3;

export interface HeatmapCell {
  locationId: string;
  locationName: string;
  serviceName: string;
  totalResponses: number;
  negativeResponses: number;
  negativeRate: number; // 0..1
}

export function useNegativeReviewHeatmap(days: number = 90) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['negative-review-heatmap', orgId, days],
    queryFn: async (): Promise<HeatmapCell[]> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const responses = await fetchAllBatched<{
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

      const apptIds = Array.from(
        new Set(responses.map((r) => r.appointment_id).filter(Boolean) as string[]),
      );
      if (apptIds.length === 0) return [];

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, location_id, service_name')
        .in('id', apptIds);

      const apptMap = new Map(
        (appts ?? []).map((a) => [a.id, { locationId: a.location_id, serviceName: a.service_name || 'Unspecified' }]),
      );

      const locationIds = Array.from(
        new Set((appts ?? []).map((a) => a.location_id).filter(Boolean) as string[]),
      );
      const { data: locs } = locationIds.length
        ? await supabase.from('locations').select('id, name').in('id', locationIds)
        : { data: [] };
      const locNameMap = new Map((locs ?? []).map((l) => [l.id, l.name || 'Unknown']));

      const buckets = new Map<string, HeatmapCell>();
      for (const r of responses) {
        const meta = apptMap.get(r.appointment_id || '');
        if (!meta?.locationId) continue;
        const key = `${meta.locationId}::${meta.serviceName}`;
        const existing = buckets.get(key) ?? {
          locationId: meta.locationId,
          locationName: locNameMap.get(meta.locationId) || 'Unknown',
          serviceName: meta.serviceName,
          totalResponses: 0,
          negativeResponses: 0,
          negativeRate: 0,
        };
        existing.totalResponses += 1;
        const isNegative =
          (r.overall_rating != null && r.overall_rating <= 3) ||
          (r.nps_score != null && r.nps_score <= 6);
        if (isNegative) existing.negativeResponses += 1;
        buckets.set(key, existing);
      }

      const cells: HeatmapCell[] = [];
      for (const cell of buckets.values()) {
        if (cell.totalResponses < MIN_RESPONSES_PER_CELL) continue;
        cell.negativeRate = cell.negativeResponses / cell.totalResponses;
        if (cell.negativeResponses === 0) continue;
        cells.push(cell);
      }

      return cells.sort((a, b) => b.negativeRate - a.negativeRate);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
