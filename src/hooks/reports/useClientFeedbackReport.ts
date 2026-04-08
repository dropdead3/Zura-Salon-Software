import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface FeedbackEntry {
  staffName: string;
  overallRating: number;
  npsScore: number | null;
  serviceQuality: number | null;
  staffFriendliness: number | null;
  cleanliness: number | null;
  comments: string | null;
  respondedAt: string;
}

export interface FeedbackSummary {
  avgRating: number;
  avgNPS: number;
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
}

interface Filters { dateFrom: string; dateTo: string; locationId?: string; }

export function useClientFeedbackReport(filters: Filters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['client-feedback-report', orgId, filters],
    queryFn: async () => {
      const data = await fetchAllBatched<{
        staff_user_id: string | null;
        overall_rating: number | null;
        nps_score: number | null;
        service_quality: number | null;
        staff_friendliness: number | null;
        cleanliness: number | null;
        comments: string | null;
        responded_at: string | null;
      }>((from, to) => {
        let q = supabase
          .from('client_feedback_responses')
          .select('staff_user_id, overall_rating, nps_score, service_quality, staff_friendliness, cleanliness, comments, responded_at')
          .eq('organization_id', orgId!)
          .gte('responded_at', filters.dateFrom)
          .lte('responded_at', filters.dateTo + 'T23:59:59')
          .range(from, to);
        return q;
      });

      const { data: profiles } = await supabase.from('employee_profiles').select('user_id, full_name, display_name');
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || p.full_name || 'Unknown']));

      const entries: FeedbackEntry[] = (data || []).map(r => ({
        staffName: r.staff_user_id ? (nameMap.get(r.staff_user_id) || 'Unknown') : '—',
        overallRating: r.overall_rating || 0,
        npsScore: r.nps_score,
        serviceQuality: r.service_quality,
        staffFriendliness: r.staff_friendliness,
        cleanliness: r.cleanliness,
        comments: r.comments,
        respondedAt: r.responded_at?.split('T')[0] || '',
      }));

      const npsScores = entries.filter(e => e.npsScore !== null).map(e => e.npsScore!);
      const promoters = npsScores.filter(s => s >= 9).length;
      const detractors = npsScores.filter(s => s <= 6).length;
      const passives = npsScores.length - promoters - detractors;

      const summary: FeedbackSummary = {
        avgRating: entries.length > 0 ? entries.reduce((s, e) => s + e.overallRating, 0) / entries.length : 0,
        avgNPS: npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0,
        promoters,
        passives,
        detractors,
        totalResponses: entries.length,
      };

      return { entries, summary };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
