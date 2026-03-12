import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SupplierMetrics } from '@/hooks/useSupplierPerformance';

interface SupplierScorecardProps {
  metrics: SupplierMetrics;
}

const GRADE_CONFIG = {
  A: { color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-500/10', label: 'Excellent' },
  B: { color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-500/10', label: 'Good' },
  C: { color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-500/10', label: 'Fair' },
  D: { color: 'text-red-500 dark:text-red-400', border: 'border-red-200 dark:border-red-800', bg: 'bg-red-500/10', label: 'Poor' },
};

export function SupplierScorecard({ metrics }: SupplierScorecardProps) {
  const grade = GRADE_CONFIG[metrics.grade];

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Supplier Performance</p>
          <Badge variant="outline" className={cn('text-xs font-medium', grade.color, grade.border, grade.bg)}>
            {metrics.grade} — {grade.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Fill Rate</p>
            <p className="text-sm font-medium tabular-nums">{metrics.fillRate}%</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Total Orders</p>
            <p className="text-sm font-medium tabular-nums">{metrics.totalOrders}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Avg Delivery</p>
            <p className="text-sm font-medium tabular-nums">
              {metrics.avgLeadTimeDays != null ? `${metrics.avgLeadTimeDays}d` : '—'}
              {metrics.promisedLeadTimeDays != null && (
                <span className="text-muted-foreground text-xs"> / {metrics.promisedLeadTimeDays}d promised</span>
              )}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">On-Time %</p>
            <p className="text-sm font-medium tabular-nums">
              {metrics.leadTimeAccuracy != null ? `${metrics.leadTimeAccuracy}%` : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
