/**
 * SEO Insights Card — Integration component for Zura Insights / Dashboard.
 * Surfaces top SEO risks, opportunities, and blocked growth from overdue tasks.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { useSEOHealthSummary } from '@/hooks/useSEOHealthScores';
import { useSEOOpportunityRisk } from '@/hooks/useSEOOpportunityRisk';
import { tokens } from '@/lib/design-tokens';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface Props {
  organizationId: string | undefined;
}

export function SEOInsightsCard({ organizationId }: Props) {
  const { dashPath } = useOrgDashboardPath();
  const { data: overdueTasks = [], isLoading: tasksLoading } = useSEOTasks(organizationId, {
    status: ['overdue', 'escalated'],
  });
  const { data: healthSummary, isLoading: healthLoading } = useSEOHealthSummary(organizationId);
  const { data: opRisk = [], isLoading: orLoading } = useSEOOpportunityRisk(organizationId);

  const isLoading = tasksLoading || healthLoading || orLoading;

  // Find weakest domain
  const weakestDomain = healthSummary?.length
    ? healthSummary.reduce((min, d) => (d.averageScore < min.averageScore ? d : min), healthSummary[0])
    : null;

  // Top opportunity
  const topOpportunity = opRisk.length
    ? opRisk.reduce((max: any, r: any) => ((r.opportunity_score ?? 0) > (max.opportunity_score ?? 0) ? r : max), opRisk[0])
    : null;

  // Top risk
  const topRisk = opRisk.length
    ? opRisk.reduce((max: any, r: any) => ((r.risk_score ?? 0) > (max.risk_score ?? 0) ? r : max), opRisk[0])
    : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = (healthSummary?.length ?? 0) > 0 || overdueTasks.length > 0 || opRisk.length > 0;
  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>SEO Health</CardTitle>
              <CardDescription>Local visibility risks & opportunities</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="font-sans text-xs">
            <Link to={dashPath('/admin/seo-workshop')}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-sm font-sans">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span>{overdueTasks.length} overdue SEO task{overdueTasks.length !== 1 ? 's' : ''} blocking growth</span>
          </div>
        )}

        {/* Weakest domain */}
        {weakestDomain && weakestDomain.averageScore < 70 && (
          <div className="flex items-center justify-between text-sm font-sans">
            <span className="text-muted-foreground">
              Weakest: <span className="text-foreground">{weakestDomain.domain}</span>
            </span>
            <Badge variant="outline">{weakestDomain.averageScore}/100</Badge>
          </div>
        )}

        {/* Top opportunity */}
        {topOpportunity && (topOpportunity.opportunity_score ?? 0) > 50 && (
          <div className="flex items-center justify-between text-sm font-sans">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-green-500" />
              Top opportunity
            </span>
            <Badge variant="secondary">{topOpportunity.opportunity_score}</Badge>
          </div>
        )}

        {/* Top risk */}
        {topRisk && (topRisk.risk_score ?? 0) > 50 && (
          <div className="flex items-center justify-between text-sm font-sans">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="w-3 h-3 text-destructive" />
              Top risk
            </span>
            <Badge variant="destructive">{topRisk.risk_score}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
