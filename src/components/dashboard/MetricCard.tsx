import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, DollarSign, TrendingUp, Trophy, Rocket, ClipboardCheck, BarChart3, Calendar } from "lucide-react";
import { useState } from "react";
import { MetricDefinition, MetricCategory } from "@/data/metricsGlossary";
import { cn } from "@/lib/utils";
import { AdaptiveCard } from "@/components/spatial/AdaptiveCard";
import { TruncatedText } from "@/components/spatial/TruncatedText";
import { useSpatialState } from "@/lib/responsive/useSpatialState";

const categoryIcons: Record<MetricCategory, React.ElementType> = {
  sales_revenue: DollarSign,
  forecasting: TrendingUp,
  leaderboard: Trophy,
  client_engine: Rocket,
  onboarding: ClipboardCheck,
  performance: BarChart3,
  operations: Calendar,
};

const categoryColors: Record<MetricCategory, string> = {
  sales_revenue: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  forecasting: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  leaderboard: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  client_engine: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  onboarding: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  performance: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  operations: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

interface MetricCardProps {
  metric: MetricDefinition;
}

/**
 * MetricCard — pilot of container-aware doctrine.
 * - default/compressed: full layout
 * - compact: hides Source + Updates rows (P3), keeps Formula + Related (P0/P1)
 * - stacked: hides example badge inline, stacks all metadata
 *
 * Doctrine: mem://style/container-aware-responsiveness.md
 */
export function MetricCard({ metric }: MetricCardProps) {
  const [copied, setCopied] = useState(false);
  const Icon = categoryIcons[metric.category];
  const { ref, state } = useSpatialState<HTMLDivElement>('compact');

  const isCompact = state === 'compact' || state === 'stacked';
  const isStacked = state === 'stacked';

  const handleCopyFormula = async () => {
    await navigator.clipboard.writeText(metric.formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdaptiveCard density="compact" className="hover:shadow-md transition-shadow">
      <div ref={ref} data-spatial-state={state} className={cn(
        'flex items-start gap-3',
        isStacked && 'flex-col gap-2',
      )}>
        <div className={cn("p-2 rounded-lg shrink-0", categoryColors[metric.category])}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="font-medium text-foreground min-w-0">
              <TruncatedText kind="name">{metric.name}</TruncatedText>
            </h3>
            {metric.example && !isStacked && (
              <Badge variant="secondary" className="text-xs font-mono shrink-0">
                e.g. {metric.example}
              </Badge>
            )}
          </div>

          <p className={cn("text-sm text-muted-foreground mt-1", isCompact && "line-clamp-2")}>
            {metric.description}
          </p>

          <div className={cn("mt-3 space-y-2", isCompact && "space-y-1.5")}>
            {/* Formula — P0, always visible */}
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 text-xs">Formula</Badge>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all min-w-0 flex-1">
                  {metric.formula}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={handleCopyFormula}
                  aria-label="Copy formula"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Data Source — P2, hidden at compact */}
            {!isCompact && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs">Source</Badge>
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {metric.dataSource}
                </span>
              </div>
            )}

            {/* Update Frequency — P2, hidden at compact */}
            {!isCompact && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs">Updates</Badge>
                <span className="text-xs text-muted-foreground">
                  {metric.updateFrequency}
                </span>
              </div>
            )}

            {/* Related Metrics — P1, always visible */}
            {metric.relatedMetrics && metric.relatedMetrics.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="shrink-0 text-xs">Related</Badge>
                <div className="flex gap-1 flex-wrap">
                  {metric.relatedMetrics.slice(0, isCompact ? 2 : undefined).map((id) => (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {id.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                  {isCompact && metric.relatedMetrics.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{metric.relatedMetrics.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdaptiveCard>
  );
}
