/**
 * useSEORevenuePrediction: Fetches baseline, health, momentum, and pending tasks
 * to compute predicted revenue lift per SEO object.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computePredictedLift, type PredictionBaseline, type HealthScoreMap, type PendingTask, type PredictionResult } from '@/lib/seo-engine/seo-revenue-predictor';
import { computeMomentum, type MomentumInput } from '@/lib/seo-engine/seo-momentum-calculator';

export interface ObjectPrediction {
  seoObjectId: string;
  objectLabel: string;
  locationLabel: string;
  prediction: PredictionResult;
  momentumScore: number;
  currentRevenue: number;
}

export function useSEORevenuePredictions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['seo-revenue-predictions', organizationId],
    queryFn: async (): Promise<ObjectPrediction[]> => {
      // 1. SEO objects
      const { data: objects } = await supabase
        .from('seo_objects' as any)
        .select('id, label, object_type, object_key, location_id')
        .eq('organization_id', organizationId!)
        .in('object_type', ['location_service', 'location'])
        .limit(50);

      if (!objects?.length) return [];

      // 2. Revenue baselines
      const { data: revenueRows } = await supabase
        .from('seo_object_revenue' as any)
        .select('seo_object_id, total_revenue, transaction_count')
        .eq('organization_id', organizationId!)
        .order('computed_at', { ascending: false })
        .limit(200);

      const revenueMap = new Map<string, { totalRevenue: number; transactionCount: number }>();
      for (const r of (revenueRows || []) as any[]) {
        if (!revenueMap.has(r.seo_object_id)) {
          revenueMap.set(r.seo_object_id, {
            totalRevenue: Number(r.total_revenue || 0),
            transactionCount: Number(r.transaction_count || 0),
          });
        }
      }

      // 3. Health scores (latest per object per domain)
      const { data: healthRows } = await supabase
        .from('seo_health_scores' as any)
        .select('seo_object_id, domain, score, scored_at')
        .eq('organization_id', organizationId!)
        .order('scored_at', { ascending: false })
        .limit(500);

      const healthMap = new Map<string, HealthScoreMap>();
      const seenHealth = new Set<string>();
      for (const h of (healthRows || []) as any[]) {
        const key = `${h.seo_object_id}::${h.domain}`;
        if (seenHealth.has(key)) continue;
        seenHealth.add(key);
        if (!healthMap.has(h.seo_object_id)) healthMap.set(h.seo_object_id, {});
        const m = healthMap.get(h.seo_object_id)!;
        (m as any)[h.domain] = h.score;
      }

      // 4. Pending tasks per object
      const { data: taskRows } = await supabase
        .from('seo_tasks' as any)
        .select('primary_seo_object_id, template_key, status')
        .eq('organization_id', organizationId!)
        .in('status', ['assigned', 'in_progress', 'awaiting_verification', 'open', 'pending'])
        .limit(500);

      const pendingByObject = new Map<string, PendingTask[]>();
      for (const t of (taskRows || []) as any[]) {
        const id = t.primary_seo_object_id;
        if (!id) continue;
        if (!pendingByObject.has(id)) pendingByObject.set(id, []);
        pendingByObject.get(id)!.push({ templateKey: t.template_key, status: t.status });
      }

      // 5. Location names
      const locationIds = [...new Set((objects as any[]).map(o => o.location_id).filter(Boolean))];
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds.length > 0 ? locationIds : ['__none__']);
      const locationMap = new Map((locations || []).map(l => [l.id, l.name]));

      // 6. Compute predictions
      const results: ObjectPrediction[] = [];

      for (const obj of objects as any[]) {
        const pending = pendingByObject.get(obj.id) || [];
        if (pending.length === 0) continue; // No pending tasks = no opportunity

        const rev = revenueMap.get(obj.id);
        const baseline: PredictionBaseline = {
          bookings30d: rev?.transactionCount ?? 0,
          avgTicket: rev && rev.transactionCount > 0
            ? rev.totalRevenue / rev.transactionCount
            : 150, // fallback avg ticket
          totalRevenue30d: rev?.totalRevenue ?? 0,
        };

        const health = healthMap.get(obj.id) ?? {};

        // Simple momentum score (reuse existing calculator with minimal input)
        const momentumInput: MomentumInput = {
          tasksCompleted7d: 0,
          tasksExpected7d: Math.max(pending.length, 1),
          reviewVelocityDelta: 0,
          daysSinceContentUpdate: 30,
          competitorDistanceDelta: 0,
          objectLabel: obj.label || obj.object_key || 'Unknown',
          locationLabel: locationMap.get(obj.location_id) || 'All',
        };
        const momentum = computeMomentum(momentumInput);

        const prediction = computePredictedLift({
          baseline,
          pendingTasks: pending,
          healthScores: health,
          momentumScore: momentum.score,
        });

        results.push({
          seoObjectId: obj.id,
          objectLabel: obj.label || obj.object_key || 'Unknown',
          locationLabel: locationMap.get(obj.location_id) || 'All',
          prediction,
          momentumScore: momentum.score,
          currentRevenue: baseline.totalRevenue30d,
        });
      }

      // Sort by expected revenue lift descending
      results.sort((a, b) => b.prediction.revenueLift.expected - a.prediction.revenueLift.expected);

      return results.slice(0, 10);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for campaign-level prediction.
 */
export function useSEOCampaignPrediction(
  organizationId: string | undefined,
  campaignId: string | undefined,
) {
  return useQuery({
    queryKey: ['seo-campaign-prediction', organizationId, campaignId],
    queryFn: async () => {
      // Fetch campaign tasks
      const { data: tasks } = await supabase
        .from('seo_tasks' as any)
        .select('primary_seo_object_id, template_key, status, location_id')
        .eq('organization_id', organizationId!)
        .eq('campaign_id', campaignId!)
        .limit(100);

      if (!tasks?.length) return null;

      const allTasks = tasks as any[];
      const completedCount = allTasks.filter(t => t.status === 'completed').length;
      const pendingTasks: PendingTask[] = allTasks
        .filter(t => t.status !== 'completed' && t.status !== 'abandoned' && t.status !== 'suppressed')
        .map(t => ({ templateKey: t.template_key, status: t.status }));

      // Get the primary object for baseline
      const objectIds = [...new Set(allTasks.map(t => t.primary_seo_object_id).filter(Boolean))];
      
      // Revenue baseline
      const { data: revRows } = await supabase
        .from('seo_object_revenue' as any)
        .select('seo_object_id, total_revenue, transaction_count')
        .eq('organization_id', organizationId!)
        .in('seo_object_id', objectIds.length > 0 ? objectIds : ['__none__'])
        .order('computed_at', { ascending: false })
        .limit(50);

      let totalRevenue = 0;
      let totalTransactions = 0;
      const seen = new Set<string>();
      for (const r of (revRows || []) as any[]) {
        if (seen.has(r.seo_object_id)) continue;
        seen.add(r.seo_object_id);
        totalRevenue += Number(r.total_revenue || 0);
        totalTransactions += Number(r.transaction_count || 0);
      }

      const baseline: PredictionBaseline = {
        bookings30d: totalTransactions,
        avgTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 150,
        totalRevenue30d: totalRevenue,
      };

      // Health scores
      const { data: healthRows } = await supabase
        .from('seo_health_scores' as any)
        .select('seo_object_id, domain, score')
        .eq('organization_id', organizationId!)
        .in('seo_object_id', objectIds.length > 0 ? objectIds : ['__none__'])
        .order('scored_at', { ascending: false })
        .limit(100);

      const healthScores: HealthScoreMap = {};
      const seenDomains = new Set<string>();
      for (const h of (healthRows || []) as any[]) {
        if (seenDomains.has(h.domain)) continue;
        seenDomains.add(h.domain);
        (healthScores as any)[h.domain] = h.score;
      }

      const prediction = computePredictedLift({
        baseline,
        pendingTasks,
        healthScores,
        momentumScore: undefined,
      });

      return {
        prediction,
        completedCount,
        totalCount: allTasks.length,
        pendingCount: pendingTasks.length,
      };
    },
    enabled: !!organizationId && !!campaignId,
    staleTime: 1000 * 60 * 5,
  });
}
