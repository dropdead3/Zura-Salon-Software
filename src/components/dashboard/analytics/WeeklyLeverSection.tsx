import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { WeeklyLeverBrief } from '@/components/executive-brief/WeeklyLeverBrief';
import { SilenceState } from '@/components/executive-brief/SilenceState';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { useActiveRecommendation, useGenerateRecommendation } from '@/hooks/useLeverRecommendations';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { X } from 'lucide-react';

interface WeeklyLeverSectionProps {
  onClose?: () => void;
}

export function WeeklyLeverSection({ onClose }: WeeklyLeverSectionProps) {
  const { data: recommendation, isLoading } = useActiveRecommendation();
  const generateMutation = useGenerateRecommendation();

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base font-medium tracking-wide uppercase">
                WEEKLY LEVER
              </CardTitle>
              <MetricInfoTooltip description="The single highest-confidence action recommended by Zura this week. Generated from performance data, benchmarks, and operational signals. Only surfaces when confidence is high." />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size={tokens.button.card}
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', generateMutation.isPending && 'animate-spin')} />
              {generateMutation.isPending ? 'Generating...' : 'Generate New'}
            </Button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <EnforcementGateBanner gateKey="gate_kpi_architecture">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recommendation ? (
            <WeeklyLeverBrief recommendation={recommendation} />
          ) : (
            <SilenceState />
          )}
        </EnforcementGateBanner>
      </CardContent>
    </Card>
  );
}
