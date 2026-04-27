import { useMemo } from 'react';
import { isPast, parseISO, startOfDay, format } from 'date-fns';
import { useZuraCapital, type ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';
import { useCapitalProjects } from '@/hooks/useCapitalProjects';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useZuraActionsAttribution } from '@/hooks/useZuraActionsAttribution';
import { useStylistGoalsNudge } from '@/hooks/useStylistGoalsNudge';
import type { Task } from '@/hooks/useTasks';

// ── Types ────────────────────────────────────────────────────────────

export type BriefingRoleContext = 'owner' | 'manager' | 'stylist';

export interface BriefingFocus {
  title: string;
  locationLabel: string | null;
  revenueLiftCents: number;
  contextLine: string;
  opportunityId: string | null;
}

export interface AutomatedAction {
  label: string;
  count: number;
}

export interface BriefingBlocker {
  label: string;
  revenueLostCents: number | null;
}

export interface ActiveGrowthMove {
  title: string;
  status: string;
  type: 'capital' | 'seo_campaign';
}

export interface DailyBriefingEngineData {
  /** Single top-priority focus directive */
  focus: BriefingFocus | null;
  /** Automated actions Zura completed today */
  automatedActions: AutomatedAction[];
  /** 2-4 revenue-linked tasks the user should execute today */
  shouldDoTasks: Task[];
  /** Operational blockers limiting growth */
  blockers: BriefingBlocker[];
  /** Remaining opportunity this month (cents) */
  opportunityRemainingCents: number;
  /** Revenue captured this month from Zura actions (cents) */
  capturedCents: number;
  /** Active capital projects + SEO campaigns */
  activeGrowthMoves: ActiveGrowthMove[];
  /** Revenue at risk from missed/overdue tasks */
  atRiskCents: number;
  /** Whether the engine is still loading */
  isLoading: boolean;
  /** Whether there's any meaningful content to show */
  hasContent: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useDailyBriefingEngine(
  tasks: Task[],
  roleContext: BriefingRoleContext = 'owner',
): DailyBriefingEngineData {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Capital data (super admin / primary owner only)
  const showCapital = roleContext === 'owner';
  const { topOpportunity, opportunities, activeProjectCount, isLoading: capitalLoading } = useZuraCapital();
  const { data: capitalProjects = [], isLoading: projectsLoading } = useCapitalProjects(
    ['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk'],
  );

  // SEO automated actions today
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
  const { data: seoTasks = [], isLoading: seoLoading } = useSEOTasks(orgId, {
    status: ['completed'],
  });

  // Attribution
  const { data: attribution } = useZuraActionsAttribution();

  return useMemo(() => {
    // ── 1. TODAY'S FOCUS ──────────────────────────────────────────────
    let focus: BriefingFocus | null = null;

    if (showCapital && topOpportunity) {
      focus = {
        title: topOpportunity.title,
        locationLabel: null, // Could be enriched with location name lookup
        revenueLiftCents: topOpportunity.predictedLiftExpectedCents,
        contextLine: topOpportunity.summary || 'High-confidence growth opportunity detected.',
        opportunityId: topOpportunity.id,
      };
    } else {
      // Fall back to highest-impact active task
      const activeTasks = tasks.filter(t => !t.is_completed);
      const topTask = [...activeTasks]
        .sort((a, b) => (b.estimated_revenue_impact_cents || 0) - (a.estimated_revenue_impact_cents || 0))
        .find(t => (t.estimated_revenue_impact_cents || 0) > 0);
      if (topTask) {
        focus = {
          title: topTask.title,
          locationLabel: null,
          revenueLiftCents: topTask.estimated_revenue_impact_cents || 0,
          contextLine: topTask.description || 'Complete this task to capture revenue.',
          opportunityId: null,
        };
      }
    }

    // ── 2. ZURA ALREADY DID (automated SEO actions today) ────────────
    const todaySeoCompleted = (seoTasks as any[]).filter((t: any) =>
      t.completed_at && t.completed_at.startsWith(todayStr) && t.assigned_to === 'system',
    );

    const automatedActions: AutomatedAction[] = [];
    if (todaySeoCompleted.length > 0) {
      // Group by template_key for cleaner display
      const grouped: Record<string, number> = {};
      todaySeoCompleted.forEach((t: any) => {
        const key = t.template_key || 'seo_task';
        grouped[key] = (grouped[key] || 0) + 1;
      });

      const labelMap: Record<string, string> = {
        'gbp_post': 'Published Google update',
        'review_request': 'Sent review request',
        'photo_upload': 'Optimized photos',
        'meta_update': 'Updated page metadata',
        'citation_check': 'Verified citations',
      };

      Object.entries(grouped).forEach(([key, count]) => {
        automatedActions.push({
          label: labelMap[key] || `Completed ${key.replace(/_/g, ' ')}`,
          count,
        });
      });
    }

    // ── 3. YOU SHOULD DO (2-4 revenue-linked tasks) ──────────────────
    const activeTasks = tasks.filter(t => !t.is_completed);
    const nonExpired = activeTasks.filter(
      t => !t.expires_at || !isPast(parseISO(t.expires_at)),
    );

    // For stylists, only show personal tasks (already filtered by useTasks)
    const sorted = [...nonExpired].sort((a, b) => {
      // Primary: priority_score descending (when available)
      const aScore = a.priority_score ?? -1;
      const bScore = b.priority_score ?? -1;
      if (aScore !== bScore) return bScore - aScore;
      // Fallback: revenue impact then priority
      const aImpact = a.estimated_revenue_impact_cents || 0;
      const bImpact = b.estimated_revenue_impact_cents || 0;
      if (bImpact !== aImpact) return bImpact - aImpact;
      const prioWeight = { high: 3, normal: 2, low: 1 };
      return prioWeight[b.priority] - prioWeight[a.priority];
    });

    const shouldDoTasks = sorted.slice(0, 4);

    // ── 4. BLOCKERS ──────────────────────────────────────────────────
    const blockers: BriefingBlocker[] = [];

    // Detect expired tasks as blockers (opportunity decay)
    const expiredWithRevenue = activeTasks.filter(
      t => t.expires_at && isPast(parseISO(t.expires_at)) && (t.estimated_revenue_impact_cents || 0) > 0,
    );
    if (expiredWithRevenue.length > 0) {
      const lostCents = expiredWithRevenue.reduce(
        (sum, t) => sum + (t.missed_revenue_cents || t.estimated_revenue_impact_cents || 0), 0,
      );
      blockers.push({
        label: `${expiredWithRevenue.length} expired task${expiredWithRevenue.length !== 1 ? 's' : ''} with decayed opportunities`,
        revenueLostCents: lostCents,
      });
    }

    // Detect missed revenue from tasks already marked
    const missedTasks = tasks.filter(t => (t.missed_revenue_cents || 0) > 0);
    const totalMissedCents = missedTasks.reduce((sum, t) => sum + (t.missed_revenue_cents || 0), 0);
    if (totalMissedCents > 0 && expiredWithRevenue.length === 0) {
      blockers.push({
        label: `Missed opportunities from expired tasks`,
        revenueLostCents: totalMissedCents,
      });
    }

    // Detect enforcement warnings (tasks with level >= 2 overdue)
    const enforcementOverdue = activeTasks.filter(t =>
      t.enforcement_level >= 2 && t.due_date && isPast(parseISO(t.due_date)),
    );
    if (enforcementOverdue.length > 0) {
      blockers.push({
        label: `${enforcementOverdue.length} high-enforcement task${enforcementOverdue.length !== 1 ? 's' : ''} overdue — may impact access`,
        revenueLostCents: null,
      });
    }

    // Detect at-risk capital projects as blockers
    if (showCapital) {
      const atRiskProjects = (capitalProjects as any[]).filter(p => p.status === 'at_risk');
      atRiskProjects.forEach((p: any) => {
        blockers.push({
          label: `${p.capital_funding_opportunities?.title || 'Capital project'} is at risk`,
          revenueLostCents: null,
        });
      });
    }

    // ── 5. OPPORTUNITY REMAINING ─────────────────────────────────────
    const capturedCents = attribution?.totalCents || 0;

    // Sum predicted lift from all eligible opportunities
    const totalPredictedCents = showCapital
      ? opportunities.filter(o => o.zuraEligible).reduce(
          (sum, o) => sum + o.predictedLiftExpectedCents, 0,
        )
      : 0;

    // Also include uncompleted task revenue
    const taskRevenuePotential = nonExpired.reduce(
      (sum, t) => sum + (t.estimated_revenue_impact_cents || 0), 0,
    );

    const opportunityRemainingCents = totalPredictedCents + taskRevenuePotential;

    // ── 6. ACTIVE GROWTH MOVES ───────────────────────────────────────
    const activeGrowthMoves: ActiveGrowthMove[] = [];

    if (showCapital) {
      (capitalProjects as any[]).slice(0, 3).forEach((p: any) => {
        activeGrowthMoves.push({
          title: p.capital_funding_opportunities?.title || 'Capital Project',
          status: p.status,
          type: 'capital',
        });
      });
    }

    // ── 7. AT RISK (missed/overdue tasks) ────────────────────────────
    const overdueTasks = activeTasks.filter(t => {
      if (!t.due_date) return false;
      return isPast(parseISO(t.due_date));
    });
    const atRiskCents = overdueTasks.reduce(
      (sum, t) => sum + (t.estimated_revenue_impact_cents || 0), 0,
    );

    const hasContent = !!focus || automatedActions.length > 0 || shouldDoTasks.length > 0
      || blockers.length > 0 || activeGrowthMoves.length > 0 || capturedCents > 0;

    return {
      focus,
      automatedActions,
      shouldDoTasks,
      blockers,
      opportunityRemainingCents,
      capturedCents,
      activeGrowthMoves,
      atRiskCents,
      isLoading: capitalLoading || projectsLoading || seoLoading,
      hasContent,
    };
  }, [
    tasks, topOpportunity, opportunities, capitalProjects, seoTasks,
    todayStr, attribution, showCapital, capitalLoading, projectsLoading, seoLoading,
  ]);
}
