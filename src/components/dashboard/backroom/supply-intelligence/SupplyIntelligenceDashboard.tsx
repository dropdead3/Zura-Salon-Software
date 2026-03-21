/**
 * SupplyIntelligenceDashboard — Unified Supply AI Layer.
 * Consolidates waste, reorder risk, margin, and usage intelligence.
 */

import { useState } from 'react';
import { RefreshCw, Loader2, Brain, Zap, BarChart3, Lock, Bell, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import {
  useSupplyIntelligence,
  useRefreshSupplyIntelligence,
} from '@/hooks/backroom/useSupplyIntelligence';
import { useBackroomSetting, useUpsertBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';
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

const FREQUENCY_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export function SupplyIntelligenceDashboard({ locationId }: SupplyIntelligenceDashboardProps) {
  const { data, isLoading } = useSupplyIntelligence(locationId);
  const refresh = useRefreshSupplyIntelligence();
  const [filter, setFilter] = useState<string>('all');
  const orgId = useBackroomOrgId();

  // Digest frequency setting
  const { data: digestSetting } = useBackroomSetting('supply_digest_frequency');
  const digestFrequency = (digestSetting?.value?.frequency as string) ?? 'weekly';

  // Cost alert threshold setting
  const { data: alertSetting } = useBackroomSetting('cost_alert_threshold');
  const alertEnabled = (alertSetting?.value?.enabled as boolean) ?? false;
  const alertThreshold = (alertSetting?.value?.threshold_pct as number) ?? 10;

  const upsertSetting = useUpsertBackroomSetting();

  const handleDigestFrequencyChange = (frequency: string) => {
    if (!orgId) return;
    upsertSetting.mutate({
      organization_id: orgId,
      setting_key: 'supply_digest_frequency',
      setting_value: { frequency },
    });
  };

  const handleAlertToggle = (enabled: boolean) => {
    if (!orgId) return;
    upsertSetting.mutate({
      organization_id: orgId,
      setting_key: 'cost_alert_threshold',
      setting_value: { enabled, threshold_pct: alertThreshold },
    });
  };

  const handleAlertThresholdChange = (pct: number) => {
    if (!orgId) return;
    upsertSetting.mutate({
      organization_id: orgId,
      setting_key: 'cost_alert_threshold',
      setting_value: { enabled: alertEnabled, threshold_pct: pct },
    });
  };

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

      {/* Product Cost Trends */}
      <ProductCostTrendSection />

      {/* Digest & Alert Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Digest Frequency */}
        <Card className={tokens.card.wrapper}>
          <CardContent className="flex items-center gap-4 py-4 px-5">
            <div className={tokens.card.iconBox}>
              <Mail className={tokens.card.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={tokens.body.emphasis}>Digest Emails</p>
              <p className={cn(tokens.body.muted, 'text-xs')}>Intelligence summary to admins</p>
            </div>
            <div className="flex gap-1">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleDigestFrequencyChange(opt.value)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-sans font-medium transition-colors',
                    digestFrequency === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Alert Threshold */}
        <Card className={tokens.card.wrapper}>
          <CardContent className="flex items-center gap-4 py-4 px-5">
            <div className={tokens.card.iconBox}>
              <Bell className={tokens.card.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={tokens.body.emphasis}>Cost Spike Alerts</p>
              <p className={cn(tokens.body.muted, 'text-xs')}>
                Notify when cost rises &gt;{alertThreshold}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={alertThreshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0 && val <= 100) handleAlertThresholdChange(val);
                }}
                className="w-16 h-8 text-xs text-center rounded-lg"
                disabled={!alertEnabled}
              />
              <span className={cn(tokens.body.muted, 'text-xs')}>%</span>
              <Switch
                checked={alertEnabled}
                onCheckedChange={handleAlertToggle}
              />
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Benchmarking Roadmap Placeholder */}
      <Card className={cn(tokens.card.wrapper, 'border-dashed opacity-75')}>
        <CardContent className="flex items-center gap-4 py-6">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={tokens.body.emphasis}>Price Benchmarking</h3>
              <Badge variant="secondary" className="font-sans text-[10px]">
                <Lock className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>
            </div>
            <p className={tokens.body.muted}>
              Compare your supply costs against anonymized industry data from comparable salons in your region.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
