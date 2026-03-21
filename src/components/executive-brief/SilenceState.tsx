import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { useKpiDefinitions } from '@/hooks/useKpiDefinitions';
import { PLATFORM_NAME } from '@/lib/brand';

interface SilenceStateProps {
  compact?: boolean;
}

/**
 * SilenceState — Designed silence, now KPI-aware.
 *
 * When no KPIs are defined, this communicates setup is needed.
 * When KPIs exist but no high-confidence lever is found, it confirms operations are healthy.
 */
export function SilenceState({ compact = false }: SilenceStateProps) {
  const { data: kpiDefinitions, isLoading } = useKpiDefinitions();
  const navigate = useNavigate();

  const hasNoKpis = !isLoading && (!kpiDefinitions || kpiDefinitions.length === 0);

  // --- Compact variants ---
  if (compact) {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      );
    }

    if (hasNoKpis) {
      return (
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-[hsl(var(--platform-foreground))]">No KPIs configured</span>
          <Button
            variant="link"
            size={tokens.button.inline}
            className="ml-auto h-auto p-0 text-xs"
            onClick={() => navigate('/dashboard/admin/kpi-builder')}
          >
            Build KPIs <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
        <span className="text-sm text-[hsl(var(--platform-foreground))]">Operations within thresholds</span>
        <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    );
  }

  // --- Full variants ---
  if (isLoading) return null;

  if (hasNoKpis) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-6">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium tracking-tight text-[hsl(var(--platform-foreground))]">
            No KPIs configured yet
          </h3>
          <p className="mt-2 max-w-sm text-sm text-[hsl(var(--platform-foreground-muted))]">
            Before {PLATFORM_NAME} can surface levers, define the metrics you want monitored — targets, thresholds, and review cadence.
          </p>
          <Button
            className="mt-6"
            onClick={() => navigate('/dashboard/admin/kpi-builder')}
          >
            Build KPI Architecture
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h3 className="text-lg font-medium tracking-tight text-[hsl(var(--platform-foreground))]">
          Operations within thresholds
        </h3>
        <p className="mt-2 max-w-sm text-sm text-[hsl(var(--platform-foreground-muted))]">
          No high-confidence lever detected this period. All monitored KPIs are operating within their defined ranges.
        </p>
        <p className="mt-4 text-xs text-[hsl(var(--platform-foreground-muted))]">
          Last reviewed: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </CardContent>
    </Card>
  );
}
