import { useState } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { ChevronDown, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { RISK_TIER_COLORS, getRiskTier, CATEGORY_LABELS, type HealthCategory } from '@/hooks/useHealthEngine';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';

interface HealthCategoryCardProps {
  categoryKey: string;
  category: HealthCategory;
  className?: string;
}

export function HealthCategoryCard({ categoryKey, category, className }: HealthCategoryCardProps) {
  const [open, setOpen] = useState(false);
  const tier = getRiskTier(category.score);
  const label = CATEGORY_LABELS[categoryKey] || categoryKey;

  if (!category.available) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn('rounded-xl border border-border/50 bg-card overflow-hidden', className)}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left">
            {/* Score pill */}
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-display text-sm font-medium',
              RISK_TIER_COLORS[tier],
              tier === 'elite' ? 'bg-emerald-500/10' :
              tier === 'strong' ? 'bg-blue-500/10' :
              tier === 'at_risk' ? 'bg-amber-500/10' :
              'bg-destructive/10'
            )}>
              {category.score}
            </div>

            {/* Label + progress bar */}
            <div className="flex-1 min-w-0">
              <span className={cn(tokens.card.title, 'block')}>{label}</span>
              <Progress value={category.score} className="h-1.5 mt-1.5" />
            </div>

            {/* Chevron */}
            <ChevronDown className={cn(
              'w-4 h-4 text-muted-foreground transition-transform shrink-0',
              open && 'rotate-180'
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
            {/* Diagnostics summary */}
            <div className="grid grid-cols-1 gap-2">
              {category.topDrag && category.topDrag !== 'No major drags' && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className={tokens.body.muted}>{category.topDrag}</span>
                </div>
              )}
              {category.topStrength && category.topStrength !== 'Building data' && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className={tokens.body.muted}>{category.topStrength}</span>
                </div>
              )}
              {category.leverRecommendation && (
                <div className="flex items-start gap-2 text-sm">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <span className={cn(tokens.body.emphasis)}>{category.leverRecommendation}</span>
                </div>
              )}
            </div>

            {/* Individual metrics */}
            <div className="space-y-2 mt-2">
              {category.metrics.map((metric) => (
                <HealthMetricRow key={metric.name} metric={metric} />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function HealthMetricRow({ metric }: { metric: HealthCategory['metrics'][number] }) {
  const impactColor = metric.impact === 'positive' ? 'text-emerald-500' : metric.impact === 'negative' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 min-w-0">
        <span className={cn(tokens.body.default, 'text-xs block')}>{metric.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={cn('font-display text-sm font-medium', impactColor)}>
          {typeof metric.value === 'number' && metric.value % 1 !== 0 ? metric.value.toFixed(1) : metric.value}
        </span>
        <span className="text-[10px] text-muted-foreground">
          / {metric.benchmark}
        </span>
        <div className="w-12">
          <Progress value={metric.score} className="h-1" />
        </div>
      </div>
    </div>
  );
}
