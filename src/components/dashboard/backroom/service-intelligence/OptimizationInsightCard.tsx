import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { OptimizationInsight } from '@/lib/backroom/service-intelligence-engine';

interface OptimizationInsightCardProps {
  insight: OptimizationInsight;
}

const typeIcons: Record<OptimizationInsight['type'], typeof AlertTriangle> = {
  high_variance: BarChart3,
  high_waste: AlertTriangle,
  low_margin: DollarSign,
  rising_cost: TrendingUp,
};

const typeLabels: Record<OptimizationInsight['type'], string> = {
  high_variance: 'Usage Variance',
  high_waste: 'High Waste',
  low_margin: 'Low Margin',
  rising_cost: 'Rising Cost',
};

const severityStyles: Record<OptimizationInsight['severity'], string> = {
  critical: 'border-l-destructive bg-destructive/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-primary bg-primary/5',
};

const severityBadge: Record<OptimizationInsight['severity'], string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  info: 'bg-primary/10 text-primary border-primary/20',
};

export function OptimizationInsightCard({ insight }: OptimizationInsightCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const Icon = typeIcons[insight.type];

  return (
    <Card className={cn('border-l-4', severityStyles[insight.severity])}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(tokens.card.iconBox, 'shrink-0 mt-0.5')}>
            <Icon className={tokens.card.icon} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={tokens.body.emphasis}>{insight.service_name}</span>
              <Badge variant="outline" className={cn('text-[10px]', severityBadge[insight.severity])}>
                {typeLabels[insight.type]}
              </Badge>
            </div>

            <p className={tokens.heading.subsection}>{insight.headline}</p>
            <p className={tokens.body.muted}>{insight.detail}</p>

            {insight.estimated_annual_savings != null && insight.estimated_annual_savings > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-sans text-sm font-medium text-emerald-600">
                  Est. annual savings: {formatCurrency(insight.estimated_annual_savings)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
