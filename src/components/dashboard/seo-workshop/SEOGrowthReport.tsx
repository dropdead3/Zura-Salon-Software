import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { useSEOLatestGrowthReport } from '@/hooks/useSEOAutonomousActions';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { Zap, ArrowRight, CheckCircle2, Clock, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  organizationId: string | undefined;
}

export function SEOGrowthReport({ organizationId }: Props) {
  const { data: report, isLoading } = useSEOLatestGrowthReport(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Growth Report</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Growth Report</CardTitle>
              <CardDescription className="font-sans">No autonomous actions yet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground font-sans">
            Enable Autonomous Mode in SEO settings to start generating daily growth reports.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { impact_summary, actions_taken, next_best_action, remaining_opportunity, report_date } = report;
  const formattedDate = new Date(report_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Growth Report</CardTitle>
              <CardDescription className="font-sans">{formattedDate}</CardDescription>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="font-sans text-xs">
                Auto
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Actual results may vary based on seasonality and execution quality.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions Taken */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-sans tracking-wide uppercase">Yesterday</p>
          <div className="space-y-1.5">
            {actions_taken.map((action) => {
              const template = SEO_TASK_TEMPLATES[action.template_key];
              return (
                <div key={action.template_key} className="flex items-center gap-2 text-sm font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>{template?.label || action.template_key}</span>
                  <Badge variant="outline" className="text-xs font-sans ml-auto">
                    ×{action.count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact */}
        <div className="flex items-center gap-4 text-sm font-sans">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Auto:</span>
            <span className="font-display tracking-wide">{impact_summary?.auto_executed ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-muted-foreground">Queued:</span>
            <span className="font-display tracking-wide">{impact_summary?.assisted_queued ?? 0}</span>
          </div>
        </div>

        {/* Remaining Opportunity */}
        {remaining_opportunity !== null && remaining_opportunity > 0 && (
          <div className="flex items-center gap-2 text-sm font-sans">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Remaining tasks:</span>
            <span className="font-display tracking-wide">{remaining_opportunity}</span>
          </div>
        )}

        {/* Next Best Action */}
        {next_best_action && (
          <div className="rounded-lg bg-muted/50 p-3 border border-border/60">
            <p className="text-xs text-muted-foreground font-sans mb-1">Next Best Action</p>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-sm font-sans">{next_best_action.title}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
