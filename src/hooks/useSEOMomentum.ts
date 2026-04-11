/**
 * useSEOMomentum: Fetches real data and computes momentum scores
 * for SEO objects (service-location pairs) in an organization.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeMomentum, type MomentumInput, type MomentumResult } from '@/lib/seo-engine/seo-momentum-calculator';

export function useSEOMomentum(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['seo-momentum', organizationId],
    queryFn: async (): Promise<MomentumResult[]> => {
      // 1. Fetch SEO objects for this org
      const { data: objects } = await supabase
        .from('seo_objects' as any)
        .select('id, label, object_type, object_key, location_id')
        .eq('organization_id', organizationId!)
        .in('object_type', ['location_service', 'location'])
        .limit(50);

      if (!objects?.length) return [];

      // 2. Fetch task completion data (7d window)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentTasks } = await supabase
        .from('seo_tasks' as any)
        .select('id, status, primary_seo_object_id, completed_at, created_at')
        .eq('organization_id', organizationId!)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(500);

      // 3. Fetch content health scores for freshness
      const { data: contentScores } = await supabase
        .from('seo_health_scores' as any)
        .select('seo_object_id, score, raw_signals, scored_at')
        .eq('organization_id', organizationId!)
        .eq('domain', 'content')
        .order('scored_at', { ascending: false })
        .limit(100);

      // 4. Fetch review health scores
      const { data: reviewScores } = await supabase
        .from('seo_health_scores' as any)
        .select('seo_object_id, score, raw_signals, scored_at')
        .eq('organization_id', organizationId!)
        .eq('domain', 'review')
        .order('scored_at', { ascending: false })
        .limit(100);

      // 5. Fetch location names for display
      const locationIds = [...new Set((objects as any[]).map(o => o.location_id).filter(Boolean))];
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds.length > 0 ? locationIds : ['__none__']);

      const locationMap = new Map((locations || []).map(l => [l.id, l.name]));

      // Build per-object momentum inputs
      const contentScoreMap = new Map<string, any>();
      for (const cs of (contentScores || []) as any[]) {
        if (!contentScoreMap.has(cs.seo_object_id)) {
          contentScoreMap.set(cs.seo_object_id, cs);
        }
      }

      const reviewScoreMap = new Map<string, any>();
      for (const rs of (reviewScores || []) as any[]) {
        if (!reviewScoreMap.has(rs.seo_object_id)) {
          reviewScoreMap.set(rs.seo_object_id, rs);
        }
      }

      const results: MomentumResult[] = [];

      for (const obj of objects as any[]) {
        // Task velocity
        const objTasks = (recentTasks || []).filter((t: any) => t.primary_seo_object_id === obj.id);
        const completed = objTasks.filter((t: any) => t.status === 'completed').length;
        const total = objTasks.length;

        // Content freshness
        const contentData = contentScoreMap.get(obj.id);
        const daysSinceContent = contentData?.scored_at
          ? Math.floor((Date.now() - new Date(contentData.scored_at).getTime()) / 86400000)
          : 90;

        // Review velocity (use score as proxy — higher score = positive velocity)
        const reviewData = reviewScoreMap.get(obj.id);
        const reviewScore = reviewData?.score ?? 50;
        const reviewVelocityDelta = Math.round((reviewScore - 50) / 5); // normalize to approx ±10

        const input: MomentumInput = {
          tasksCompleted7d: completed,
          tasksExpected7d: Math.max(total, 1),
          reviewVelocityDelta,
          daysSinceContentUpdate: daysSinceContent,
          competitorDistanceDelta: 0, // No competitor data yet
          objectLabel: obj.label || obj.object_key || 'Unknown',
          locationLabel: locationMap.get(obj.location_id) || 'All',
        };

        results.push(computeMomentum(input));
      }

      // Sort by absolute score descending (most significant signals first)
      results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

      return results.slice(0, 10); // Top 10 momentum signals
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}
