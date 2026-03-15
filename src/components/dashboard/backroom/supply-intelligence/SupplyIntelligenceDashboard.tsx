/**
 * SupplyIntelligenceDashboard — Unified Supply AI Layer.
 * Consolidates waste, reorder risk, margin, and usage intelligence.
 */

import { useState } from 'react';
import { RefreshCw, Loader2, Brain, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import {
  useSupplyIntelligence,
  useRefreshSupplyIntelligence,
} from '@/hooks/backroom/useSupplyIntelligence';
import { SupplyKPICards } from './SupplyKPICards';
import { SupplyInsightCard } from './SupplyInsightCard';
import { ProductCostTrendSection } from './ProductCostTrendSection';

interface SupplyIntelligenceDashboardProps {
  locationId?: string | null;
}

const healthLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  healthy: { label: 'Healthy', variant: 'secondary' },
  attention_needed: { label: 'Attention Needed', variant: 'default' },
  critical: { label: 'Critical', variant: 'destructive' },
};

export function SupplyIntelligenceDashboard({ locationId }: SupplyIntelligenceDashboardProps) {
  const { data, isLoading } = useSupplyIntelligence(locationId);
  const refresh = useRefreshSupplyIntelligence();
  const [filter, setFilter] = useState<string>('all');

  const insights = data?.insights ?? [];
  const filteredInsights =
    filter === 'all' ? insights : insights.filter((i) => i.category === filter);

  const categories = ['all', 'inventory', 'waste', 'margin', 'usage', 'price'];

  const healthInfo = data?.overall_health
    ? healthLabels[data.overall_health]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Brain className={tokens.card.icon} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={tokens.heading.section}>Supply Intelligence</h2>
              <MetricInfoTooltip
                title="Supply Intelligence"
                description="AI-powered analysis of your supply chain across waste, reorder risk, margin opportunity, and usage variance."
              />
              {healthInfo && (
                <Badge variant={healthInfo.variant} className="font-sans text-xs">
                  {healthInfo.label}
                </Badge>
              )}
            </div>
            <p className={tokens.body.muted}>
              {data?.summary_line ?? 'Analyze your supply chain for actionable insights.'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className={tokens.button.cardAction}
          onClick={() => refresh.mutate({ locationId })}
          disabled={refresh.isPending}
        >
          {refresh.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1.5" />
          )}
          Refresh AI
        </Button>
      </div>

      {/* KPI Cards */}
      <SupplyKPICards
        kpis={data?.kpis}
        isLoading={isLoading}
        overallHealth={data?.overall_health}
      />

      {/* Insight Feed */}
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={tokens.card.iconBox}>
                <Zap className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Intelligence Feed</CardTitle>
                <CardDescription className={tokens.body.muted}>
                  {data?.generated_at
                    ? `Updated ${formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })}`
                    : 'No analysis yet'}
                </CardDescription>
              </div>
            </div>
            {insights.length > 0 && (
              <Badge variant="secondary" className="font-sans text-xs">
                {insights.length} insight{insights.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {categories.map((cat) => {
              const count =
                cat === 'all'
                  ? insights.length
                  : insights.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-sans font-medium transition-colors capitalize',
                    filter === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {cat === 'all' ? 'All' : cat} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className={tokens.empty.container}>
              <Brain className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No insights yet</h3>
              <p className={tokens.empty.description}>
                Click "Refresh AI" to generate your first supply intelligence analysis.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 pr-2">
                {filteredInsights
                  .sort((a, b) => {
                    const order = { critical: 0, warning: 1, info: 2 };
                    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
                  })
                  .map((insight, idx) => (
                    <SupplyInsightCard key={`${insight.category}-${idx}`} insight={insight} />
                  ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
