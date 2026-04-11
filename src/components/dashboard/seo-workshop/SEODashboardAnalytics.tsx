/**
 * SEO Dashboard Analytics — Task velocity, completion rates, score trends.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { useSEOHealthSummary } from '@/hooks/useSEOHealthScores';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { BarChart3, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function SEODashboardAnalytics({ organizationId }: Props) {
  const { data: allTasks = [], isLoading: tasksLoading } = useSEOTasks(organizationId);
  const { data: healthSummary, isLoading: healthLoading } = useSEOHealthSummary(organizationId);

  const analytics = useMemo(() => {
    if (!allTasks.length) return null;

    const total = allTasks.length;
    const completed = allTasks.filter((t: any) => t.status === 'completed').length;
    const canceled = allTasks.filter((t: any) => t.status === 'canceled').length;
    const overdue = allTasks.filter((t: any) => t.status === 'overdue' || t.status === 'escalated').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Completion by template
    const byTemplate: Record<string, { total: number; completed: number }> = {};
    for (const t of allTasks as any[]) {
      const key = t.template_key;
      if (!byTemplate[key]) byTemplate[key] = { total: 0, completed: 0 };
      byTemplate[key].total++;
      if (t.status === 'completed') byTemplate[key].completed++;
    }

    const templateStats = Object.entries(byTemplate)
      .map(([key, val]) => ({
        templateKey: key,
        label: SEO_TASK_TEMPLATES[key]?.label ?? key,
        total: val.total,
        completed: val.completed,
        rate: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Recent velocity (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const recentCompleted = allTasks.filter((t: any) => t.status === 'completed' && t.resolved_at && new Date(t.resolved_at).getTime() > thirtyDaysAgo).length;
    const recentCreated = allTasks.filter((t: any) => new Date(t.created_at).getTime() > thirtyDaysAgo).length;

    // Avg completion time (days)
    const completionTimes = allTasks
      .filter((t: any) => t.status === 'completed' && t.resolved_at && t.created_at)
      .map((t: any) => (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 86400000);
    const avgCompletionDays = completionTimes.length > 0
      ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) * 10) / 10
      : null;

    return {
      total, completed, canceled, overdue, completionRate,
      templateStats, recentCompleted, recentCreated, avgCompletionDays,
    };
  }, [allTasks]);

  const isLoading = tasksLoading || healthLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={tokens.empty.container}>
        <BarChart3 className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No analytics data yet</h3>
        <p className={tokens.empty.description}>Analytics will appear once tasks are generated and processed by the engine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><BarChart3 className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Total Tasks</p>
                <p className="text-2xl font-display tracking-wide">{analytics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><CheckCircle2 className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Completion Rate</p>
                <p className="text-2xl font-display tracking-wide">{analytics.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><Clock className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Avg Completion</p>
                <p className="text-2xl font-display tracking-wide">
                  {analytics.avgCompletionDays !== null ? `${analytics.avgCompletionDays}d` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><TrendingUp className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">30d Velocity</p>
                <p className="text-2xl font-display tracking-wide">{analytics.recentCompleted}/{analytics.recentCreated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={tokens.card.title}>Completion by Template</CardTitle>
          <CardDescription>Performance breakdown per task type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.templateStats.map((ts) => (
            <div key={ts.templateKey} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-sans">
                <span>{ts.label}</span>
                <span className="text-muted-foreground text-xs">{ts.completed}/{ts.total} ({ts.rate}%)</span>
              </div>
              <Progress value={ts.rate} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Health score trends placeholder */}
      {healthSummary && healthSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={tokens.card.title}>Current Health Scores</CardTitle>
            <CardDescription>Latest scores by domain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {healthSummary.map((d) => (
                <div key={d.domain} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-sans capitalize">{d.domain.replace(/_/g, ' ')}</span>
                  <Badge variant={d.averageScore >= 70 ? 'secondary' : 'destructive'} className="font-display tracking-wide">
                    {d.averageScore}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
