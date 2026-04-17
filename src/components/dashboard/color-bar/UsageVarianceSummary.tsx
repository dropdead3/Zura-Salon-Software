/**
 * UsageVarianceSummary — Shows per-product variance after session completion.
 * Compares actual bowl line usage against service formula baselines.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Check, HelpCircle } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { useUsageVariance, type UsageVariance } from '@/hooks/inventory/useUsageVariance';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

const STATUS_CONFIG: Record<UsageVariance['status'], {
  label: string;
  icon: typeof Check;
  className: string;
}> = {
  within_tolerance: {
    label: 'OK',
    icon: Check,
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  over: {
    label: 'Over',
    icon: TrendingUp,
    className: 'text-amber-600 dark:text-amber-400',
  },
  under: {
    label: 'Under',
    icon: TrendingDown,
    className: 'text-blue-600 dark:text-blue-400',
  },
  unplanned: {
    label: 'Unplanned',
    icon: AlertTriangle,
    className: 'text-amber-600 dark:text-amber-400',
  },
  missing: {
    label: 'Missing',
    icon: HelpCircle,
    className: 'text-red-600 dark:text-red-400',
  },
};

interface UsageVarianceSummaryProps {
  sessionId: string;
  serviceId: string | null;
}

export function UsageVarianceSummary({ sessionId, serviceId }: UsageVarianceSummaryProps) {
  const { data: variances, isLoading } = useUsageVariance(sessionId, serviceId);

  if (!serviceId) {
    // Visibility Contract: no service → no formula baseline → no variance possible.
    // Reason 'no-service-id' is contract-specific: upstream-prop absence,
    // distinct from 'no-data' (query ran and returned empty).
    reportVisibilitySuppression('usage-variance-summary', 'no-service-id', {
      hasServiceId: false,
      sessionId,
    });
    return null;
  }

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-4" />;
  }

  if (!variances?.length) {
    // Visibility Contract: no variance rows computed for this session.
    reportVisibilitySuppression('usage-variance-summary', 'no-data', {
      varianceCount: 0,
      sessionId,
      serviceId,
    });
    return null;
  }

  const hasIssues = variances.some((v) => v.status !== 'within_tolerance');

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="font-display text-sm tracking-wide">
            Usage Variance
          </CardTitle>
          {hasIssues && (
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
              Variance Detected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {variances.map((v) => {
            const config = STATUS_CONFIG[v.status];
            const Icon = config.icon;

            return (
              <div key={v.product_id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', config.className)} />
                  <span className="font-sans text-sm truncate">{v.product_name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-sans text-xs text-muted-foreground tabular-nums">
                    {v.actual_quantity.toFixed(1)} / {v.expected_quantity.toFixed(1)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] h-4 px-1 border-0', config.className)}
                  >
                    {v.status === 'within_tolerance'
                      ? config.label
                      : `${v.variance > 0 ? '+' : ''}${v.variance.toFixed(1)} (${v.variance_pct > 0 ? '+' : ''}${v.variance_pct}%)`}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
