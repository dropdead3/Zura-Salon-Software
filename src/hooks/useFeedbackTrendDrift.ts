import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

type Window = 30 | 90 | 365;

const MIN_RESPONSES = 5;

interface WindowStats {
  window: Window;
  count: number;
  avgRating: number | null;
  avgNps: number | null;
  detractorRate: number | null;
}

export interface FeedbackTrendDrift {
  windows: WindowStats[];
  // 30d vs 90d delta
  ratingDrift30v90: number | null;
  npsDrift30v90: number | null;
  // 90d vs 365d delta
  ratingDrift90v365: number | null;
  npsDrift90v365: number | null;
  insufficientData: boolean;
}

function summarize(rows: Array<{ overall_rating: number | null; nps_score: number | null }>): Omit<WindowStats, 'window'> {
  if (rows.length < MIN_RESPONSES) {
    return { count: rows.length, avgRating: null, avgNps: null, detractorRate: null };
  }
  const ratings = rows.map(r => r.overall_rating).filter((v): v is number => typeof v === 'number');
  const nps = rows.map(r => r.nps_score).filter((v): v is number => typeof v === 'number');
  const detractors = rows.filter(r => (r.overall_rating ?? 5) <= 3 || (r.nps_score ?? 10) <= 6).length;
  return {
    count: rows.length,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    avgNps: nps.length ? nps.reduce((a, b) => a + b, 0) / nps.length : null,
    detractorRate: rows.length ? detractors / rows.length : null,
  };
}

export function useFeedbackTrendDrift() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['feedback-trend-drift', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<FeedbackTrendDrift> => {
      const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('client_feedback_responses')
        .select('overall_rating, nps_score, responded_at, created_at')
        .eq('organization_id', orgId!)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const now = Date.now();
      const buckets: Record<Window, typeof data> = { 30: [], 90: [], 365: [] };
      (data ?? []).forEach((row) => {
        const ts = new Date(row.responded_at ?? row.created_at ?? Date.now()).getTime();
        const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
        if (ageDays <= 30) buckets[30].push(row);
        if (ageDays <= 90) buckets[90].push(row);
        if (ageDays <= 365) buckets[365].push(row);
      });

      const windows: WindowStats[] = ([30, 90, 365] as Window[]).map((w) => ({
        window: w,
        ...summarize(buckets[w] ?? []),
      }));

      const w30 = windows[0];
      const w90 = windows[1];
      const w365 = windows[2];

      const drift = (a: number | null, b: number | null): number | null =>
        a === null || b === null ? null : a - b;

      return {
        windows,
        ratingDrift30v90: drift(w30.avgRating, w90.avgRating),
        npsDrift30v90: drift(w30.avgNps, w90.avgNps),
        ratingDrift90v365: drift(w90.avgRating, w365.avgRating),
        npsDrift90v365: drift(w90.avgNps, w365.avgNps),
        insufficientData: w30.count < MIN_RESPONSES && w90.count < MIN_RESPONSES,
      };
    },
  });
}
