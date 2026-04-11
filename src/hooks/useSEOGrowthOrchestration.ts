import { useMemo } from 'react';
import { useSEOTasks } from './useSEOTasks';
import { useSEOObjectRevenue } from './useSEOObjectRevenue';
import { useSEOMomentum } from './useSEOMomentum';
import { useSEOOpportunityRisk } from './useSEOOpportunityRisk';
import { useLocations } from './useLocations';
import {
  orchestrateGrowth,
  type OrchestrationObjectInput,
  type OrchestrationMemberInput,
  type EffectivenessInput,
  type OrchestrationResult,
} from '@/lib/seo-engine/seo-growth-orchestrator';
import { computePredictedLift, type PendingTask } from '@/lib/seo-engine/seo-revenue-predictor';

/**
 * Composes data from multiple hooks and feeds the growth orchestrator.
 * Returns ranked opportunities, location states, and network summary.
 */
export function useSEOGrowthOrchestration(organizationId: string | undefined): {
  data: OrchestrationResult | null;
  isLoading: boolean;
} {
  const { data: tasks = [], isLoading: tasksLoading } = useSEOTasks(organizationId, {
    status: ['detected', 'queued', 'in_progress', 'awaiting_verification'],
  });
  const { data: revenueMap = {}, isLoading: revenueLoading } = useSEOObjectRevenue(organizationId);
  const { data: momentumSignals = [], isLoading: momentumLoading } = useSEOMomentum(organizationId);
  const { data: opportunityRisk = [], isLoading: riskLoading } = useSEOOpportunityRisk(organizationId);
  const { data: locations = [], isLoading: locationsLoading } = useLocations(organizationId);

  const isLoading = tasksLoading || revenueLoading || momentumLoading || riskLoading || locationsLoading;

  const result = useMemo(() => {
    if (isLoading || !organizationId) return null;

    // Build location label map
    const allLocationIds = locations.map((l: any) => l.id);
    const allLocationLabels: Record<string, string> = {};
    for (const loc of locations) {
      allLocationLabels[(loc as any).id] = (loc as any).name ?? (loc as any).id;
    }

    // Group tasks by SEO object
    const tasksByObject = new Map<string, any[]>();
    for (const t of tasks) {
      const objId = t.primary_seo_object_id;
      if (!objId) continue;
      if (!tasksByObject.has(objId)) tasksByObject.set(objId, []);
      tasksByObject.get(objId)!.push(t);
    }

    // Build orchestration inputs from task groups
    const objects: OrchestrationObjectInput[] = [];

    for (const [objId, objTasks] of tasksByObject) {
      const firstTask = objTasks[0];
      const seoObj = firstTask?.seo_objects;
      const locationId = firstTask?.location_id ?? '';
      const revenue = revenueMap[objId];

      // Find momentum for this object/location
      const momentum = momentumSignals.find(
        (m: any) => m.objectLabel === (seoObj?.label ?? '') && m.locationLabel === (allLocationLabels[locationId] ?? ''),
      );

      const pendingTemplateKeys = objTasks.map((t: any) => t.template_key).filter(Boolean);
      const pendingTasks: PendingTask[] = pendingTemplateKeys.map((k: string) => ({
        templateKey: k,
        status: 'pending',
      }));

      const baseline = {
        bookings30d: revenue?.transactionCount ?? 0,
        avgTicket: revenue && revenue.transactionCount > 0
          ? revenue.totalRevenue / revenue.transactionCount
          : 150,
        totalRevenue30d: revenue?.totalRevenue ?? 0,
      };

      const prediction = computePredictedLift({
        baseline,
        pendingTasks,
        healthScores: {},
        momentumScore: momentum?.score,
      });

      objects.push({
        seoObjectId: objId,
        objectLabel: seoObj?.label ?? objId,
        locationId,
        locationLabel: allLocationLabels[locationId] ?? locationId,
        predictedLift: prediction.revenueLift,
        confidence: prediction.confidence,
        pendingTemplateKeys,
        momentumScore: momentum?.score,
        momentumDirection: momentum?.direction,
        currentRevenue: baseline.totalRevenue30d,
      });
    }

    // For now, pass empty members and effectiveness (no user capacity data in current hooks)
    const members: OrchestrationMemberInput[] = [];
    const effectiveness: EffectivenessInput[] = [];

    return orchestrateGrowth(objects, members, effectiveness, allLocationIds, allLocationLabels);
  }, [isLoading, organizationId, tasks, revenueMap, momentumSignals, locations, opportunityRisk]);

  return { data: result, isLoading };
}
