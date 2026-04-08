import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useOrgHealthScore, useLocationHealthScores, useRecalculateHealth, CATEGORY_ORDER, type HealthBreakdown } from '@/hooks/useHealthEngine';
import { HealthScoreDial } from './HealthScoreDial';
import { HealthCategoryCard } from './HealthCategoryCard';
import { DataCompletenessIndicator } from './DataCompletenessIndicator';
import { LocationHealthDrilldown } from './LocationHealthDrilldown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocations } from '@/hooks/useLocations';

interface HealthDashboardProps {
  organizationId: string;
  className?: string;
}

export function HealthDashboard({ organizationId, className }: HealthDashboardProps) {
  const { data: healthScore, isLoading } = useOrgHealthScore(organizationId);
  const { data: locationScores } = useLocationHealthScores(organizationId);
  const { data: locations } = useLocations();
  const recalculate = useRecalculateHealth();

  const handleRecalculate = async () => {
    try {
      await recalculate.mutateAsync(organizationId);
      toast.success('Health scores recalculated');
    } catch {
      toast.error('Failed to recalculate scores');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (!healthScore) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardContent className="p-8">
          <div className={tokens.empty.container}>
            <Activity className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No Health Data Yet</h3>
            <p className={tokens.empty.description}>
              Run a health score calculation to see your organization's performance.
            </p>
            <Button
              onClick={handleRecalculate}
              disabled={recalculate.isPending}
              className="mt-4"
            >
              {recalculate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Calculate Health Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const breakdown = healthScore.score_breakdown;
  const availableCategories = CATEGORY_ORDER.filter(
    (key) => breakdown[key as keyof HealthBreakdown]?.available,
  );

  // Map location names
  const locMap = new Map((locations || []).map((l) => [l.id, l.name]));
  const enrichedLocations = (locationScores || []).map((ls) => ({
    ...ls,
    locationName: locMap.get(ls.location_id) || ls.location_id,
  }));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Hero: Score + Data Profile */}
      <Card className={tokens.card.wrapper}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Activity className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Health Engine</CardTitle>
              <CardDescription className={tokens.body.muted}>
                Business health score as of {new Date(healthScore.score_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
            className={tokens.button.cardAction}
          >
            {recalculate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Recalculate
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
          <HealthScoreDial
            score={healthScore.score}
            trend={healthScore.trends?.trend}
            size="lg"
          />
          <div className="flex-1 w-full">
            <DataCompletenessIndicator profile={healthScore.data_profile} />

            {/* Recommendations */}
            {healthScore.recommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                <span className={tokens.heading.subsection}>Top Recommendations</span>
                {healthScore.recommendations.slice(0, 3).map((rec, i) => (
                  <p key={i} className={cn(tokens.body.muted, 'text-xs pl-3 border-l-2 border-primary/30')}>
                    {rec}
                  </p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div>
        <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableCategories.map((key) => {
            const cat = breakdown[key as keyof HealthBreakdown];
            if (!cat) return null;
            return (
              <HealthCategoryCard key={key} categoryKey={key} category={cat} />
            );
          })}
        </div>
      </div>

      {/* Location Drill-Down */}
      {enrichedLocations.length > 1 && (
        <Card className={tokens.card.wrapper}>
          <CardContent className="p-6">
            <LocationHealthDrilldown locations={enrichedLocations} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
