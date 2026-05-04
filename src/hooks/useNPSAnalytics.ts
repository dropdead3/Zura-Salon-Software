import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NPSSnapshot {
  id: string;
  organization_id: string;
  snapshot_date: string;
  total_responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number | null;
  average_rating: number | null;
  created_at: string;
}

export interface NPSStats {
  currentNPS: number;
  previousNPS: number;
  trend: 'up' | 'down' | 'stable';
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  averageRating: number;
}

export function useNPSSnapshots(organizationId?: string, days = 30) {
  return useQuery({
    queryKey: ['nps-snapshots', organizationId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('nps_daily_snapshots' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as NPSSnapshot[];
    },
    enabled: !!organizationId,
  });
}

export function useNPSStats(organizationId?: string, locationId?: string) {
  const locFilter = locationId && locationId !== 'all' ? locationId : undefined;
  return useQuery({
    queryKey: ['nps-stats', organizationId, locFilter ?? 'all'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      let currentQ = supabase
        .from('client_feedback_responses' as any)
        .select('nps_score, overall_rating')
        .eq('organization_id', organizationId)
        .not('responded_at', 'is', null)
        .not('nps_score', 'is', null)
        .gte('responded_at', thirtyDaysAgo.toISOString());
      if (locFilter) currentQ = currentQ.eq('location_id', locFilter);
      const { data: currentData, error: currentError } = await currentQ;

      if (currentError) throw currentError;

      let previousQ = supabase
        .from('client_feedback_responses' as any)
        .select('nps_score')
        .eq('organization_id', organizationId)
        .not('responded_at', 'is', null)
        .not('nps_score', 'is', null)
        .gte('responded_at', sixtyDaysAgo.toISOString())
        .lt('responded_at', thirtyDaysAgo.toISOString());
      if (locFilter) previousQ = previousQ.eq('location_id', locFilter);
      const { data: previousData, error: previousError } = await previousQ;

      if (previousError) throw previousError;

      const currentResponses = (currentData || []) as unknown as { nps_score: number; overall_rating: number | null }[];
      const previousResponses = (previousData || []) as unknown as { nps_score: number }[];

      // Calculate current NPS
      const currentPromoters = currentResponses.filter(r => r.nps_score >= 9).length;
      const currentPassives = currentResponses.filter(r => r.nps_score >= 7 && r.nps_score <= 8).length;
      const currentDetractors = currentResponses.filter(r => r.nps_score <= 6).length;
      const currentTotal = currentResponses.length;
      const currentNPS = currentTotal > 0 
        ? Math.round(((currentPromoters - currentDetractors) / currentTotal) * 100)
        : 0;

      // Calculate previous NPS
      const previousPromoters = previousResponses.filter(r => r.nps_score >= 9).length;
      const previousDetractors = previousResponses.filter(r => r.nps_score <= 6).length;
      const previousTotal = previousResponses.length;
      const previousNPS = previousTotal > 0 
        ? Math.round(((previousPromoters - previousDetractors) / previousTotal) * 100)
        : 0;

      // Calculate average rating
      const ratingsWithValue = currentResponses.filter(r => r.overall_rating !== null);
      const averageRating = ratingsWithValue.length > 0
        ? ratingsWithValue.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratingsWithValue.length
        : 0;

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (currentNPS > previousNPS + 5) trend = 'up';
      else if (currentNPS < previousNPS - 5) trend = 'down';

      return {
        currentNPS,
        previousNPS,
        trend,
        totalResponses: currentTotal,
        promoters: currentPromoters,
        passives: currentPassives,
        detractors: currentDetractors,
        averageRating: Math.round(averageRating * 10) / 10,
      } as NPSStats;
    },
    enabled: !!organizationId,
  });
}

export function useStaffFeedbackStats(organizationId?: string) {
  return useQuery({
    queryKey: ['staff-feedback-stats', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_feedback_responses' as any)
        .select('staff_user_id, nps_score, overall_rating, staff_friendliness')
        .eq('organization_id', organizationId)
        .not('responded_at', 'is', null)
        .not('staff_user_id', 'is', null);

      if (error) throw error;

      type StaffResponse = { staff_user_id: string; nps_score: number | null; overall_rating: number | null; staff_friendliness: number | null };
      const responses = (data || []) as unknown as StaffResponse[];

      // Group by staff
      const staffStats: Record<string, { 
        totalResponses: number; 
        avgNPS: number; 
        avgRating: number; 
        avgFriendliness: number;
      }> = {};

      responses.forEach(r => {
        if (!r.staff_user_id) return;
        
        if (!staffStats[r.staff_user_id]) {
          staffStats[r.staff_user_id] = {
            totalResponses: 0,
            avgNPS: 0,
            avgRating: 0,
            avgFriendliness: 0,
          };
        }
        
        const stats = staffStats[r.staff_user_id];
        stats.totalResponses++;
        
        if (r.nps_score !== null) {
          stats.avgNPS = (stats.avgNPS * (stats.totalResponses - 1) + r.nps_score) / stats.totalResponses;
        }
        if (r.overall_rating !== null) {
          stats.avgRating = (stats.avgRating * (stats.totalResponses - 1) + r.overall_rating) / stats.totalResponses;
        }
        if (r.staff_friendliness !== null) {
          stats.avgFriendliness = (stats.avgFriendliness * (stats.totalResponses - 1) + r.staff_friendliness) / stats.totalResponses;
        }
      });

      return staffStats;
    },
    enabled: !!organizationId,
  });
}
