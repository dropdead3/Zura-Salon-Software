import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import {
  ArrowRight,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useEffectiveUserId } from '@/hooks/useEffectiveUser';
import { useFormatDate } from '@/hooks/useFormatDate';
import { usePromotionHistory } from '@/hooks/usePromotionHistory';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { StylistScorecard } from '@/components/dashboard/StylistScorecard';
import { LevelProgressionLadder } from '@/components/dashboard/LevelProgressionLadder';
import { TrendIntelligenceSection } from '@/components/dashboard/TrendIntelligenceSection';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useGoalMode } from '@/hooks/useGoalMode';
import { useAICoaching } from '@/hooks/useAICoaching';
import type { TrendProjectionResult } from '@/hooks/useTrendProjection';
import { useAuth } from '@/contexts/AuthContext';

export default function MyGraduation() {
  const effectiveUserId = useEffectiveUserId();
  const { user } = useAuth();
  const { formatDate } = useFormatDate();
  const { data: promotions = [] } = usePromotionHistory(effectiveUserId || undefined);
  const progress = useLevelProgress(effectiveUserId || undefined);
  const { data: allLevels = [] } = useStylistLevels();
  const currentLevelId = progress?.currentLevelSlug ? allLevels.find(l => l.slug === progress.currentLevelSlug)?.id : undefined;

  const [trendProjection, setTrendProjection] = useState<TrendProjectionResult | null>(null);
  const handleTrendProjection = useCallback((projection: TrendProjectionResult) => {
    setTrendProjection(projection);
  }, []);

  const hasNextLevel = !!progress?.nextLevelLabel;

  // Goal mode
  const goalMode = useGoalMode(
    effectiveUserId || undefined,
    progress?.currentLevelSlug,
    trendProjection?.projections || [],
  );

  // AI Coaching
  const { coaching, isLoading: isCoachingLoading, generateCoaching, clearCoaching } = useAICoaching();

  const handleRequestCoaching = useCallback((forceRefresh?: boolean) => {
    if (!trendProjection?.projections.length || !progress || !effectiveUserId) return;
    generateCoaching(
      effectiveUserId,
      user?.email || 'Stylist',
      progress.currentLevelLabel || '',
      progress.nextLevelLabel || null,
      trendProjection.projections,
      goalMode.daysRemaining,
      forceRefresh,
    );
  }, [trendProjection, progress, user, effectiveUserId, generateCoaching, goalMode.daysRemaining]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <DashboardPageHeader
          title="My Level Progress"
          description="Track your performance, advancement path, and retention standing."
        />
        <PageExplainer pageId="my-graduation" />

        {/* Unified Performance Scorecard */}
        <StylistScorecard
          userId={effectiveUserId || undefined}
          onTrendProjection={handleTrendProjection}
        />

        {/* Trend Intelligence Section */}
        {trendProjection && (
          <TrendIntelligenceSection
            projection={trendProjection}
            evaluationWindowDays={progress?.evaluationWindowDays || 90}
            hasNextLevel={hasNextLevel}
            goalMode={goalMode}
            coaching={coaching}
            isCoachingLoading={isCoachingLoading}
            onRequestCoaching={handleRequestCoaching}
            onDismissCoaching={clearCoaching}
          />
        )}

        {/* Level Progression Ladder */}
        <LevelProgressionLadder currentLevelId={currentLevelId} />

        {/* Retention guidance — shown when at risk */}
        {progress?.retention?.isAtRisk && (
          <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/10">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    {progress.retention.actionType === 'demotion_eligible'
                      ? 'Some of your performance metrics are below the minimum standards for your current level. Please focus on improving these areas — your manager is available to help.'
                      : 'Your performance in one or more areas has dipped below the minimum for your current level. This is a coaching opportunity — reach out to your manager to discuss a plan.'}
                  </p>
                  <div className="space-y-1">
                    {progress.retention.failures.map(f => (
                      <div key={f.key} className="flex items-center gap-2 text-xs">
                        <span className="text-rose-600 dark:text-rose-400">•</span>
                        <span className="text-muted-foreground">{f.label}:</span>
                        <span className="text-rose-700 dark:text-rose-300 tabular-nums">
                          {f.unit === '/mo' || f.unit === '$' ? `$${f.current.toLocaleString()}` : `${f.current}${f.unit}`}
                        </span>
                        <span className="text-muted-foreground">
                          (minimum: {f.unit === '/mo' || f.unit === '$' ? `$${f.minimum.toLocaleString()}` : `${f.minimum}${f.unit}`})
                        </span>
                      </div>
                    ))}
                  </div>
                  {progress.retention.gracePeriodDays > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {progress.retention.gracePeriodDays}-day improvement window
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promotion History Timeline */}
        {promotions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className={tokens.card.title}>
                <History className="w-4 h-4 mr-2 inline" />
                Level History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotions.map(p => {
                  const isDemotion = p.direction === 'demotion';
                  return (
                    <div key={p.id} className="flex items-center gap-3 text-sm">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', isDemotion ? 'bg-rose-500' : 'bg-emerald-500')} />
                      <span className="text-muted-foreground">{p.from_level}</span>
                      <ArrowRight className={cn('w-3 h-3 text-muted-foreground', isDemotion && 'rotate-90 text-rose-500')} />
                      <span className="text-foreground">{p.to_level}</span>
                      {isDemotion && <span className="text-xs text-rose-500">(Demotion)</span>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(new Date(p.promoted_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
