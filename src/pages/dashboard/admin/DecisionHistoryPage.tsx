import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, PenLine, Clock } from 'lucide-react';
import { useRecommendationHistory, type LeverRecommendation } from '@/hooks/useLeverRecommendations';
import { useFormatDate } from '@/hooks/useFormatDate';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-500' },
  modified: { label: 'Modified', icon: PenLine, color: 'text-yellow-500' },
  snoozed: { label: 'Snoozed', icon: Clock, color: 'text-[hsl(var(--platform-foreground-muted))]' },
  pending: { label: 'Pending', icon: Clock, color: 'text-[hsl(var(--platform-foreground-muted))]' },
};

const LEVER_TYPE_LABELS: Record<string, string> = {
  pricing: 'Pricing',
  utilization: 'Utilization',
  commission_alignment: 'Commission',
  staffing: 'Staffing',
  service_mix: 'Service Mix',
  retention: 'Retention',
};

export default function DecisionHistoryPage() {
  const { formatDate } = useFormatDate();
  const { data: recommendations, isLoading } = useRecommendationHistory();
  const { formatCurrencyWhole } = useFormatCurrency();

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Decision History"
        description="Every recommendation tracked: what was surfaced, what was decided."
      />

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--platform-foreground-muted))]" />
          </div>
        ) : !recommendations?.length ? (
          <Card className="rounded-xl shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No recommendations have been generated yet. Visit the Leadership tab in Analytics to generate your first analysis.
              </p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((rec) => {
            const config = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;

            return (
              <Card key={rec.id} className="rounded-xl shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {LEVER_TYPE_LABELS[rec.lever_type] || rec.lever_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${
                            rec.confidence === 'high' ? 'border-green-500/30 text-green-600' :
                            rec.confidence === 'medium' ? 'border-yellow-500/30 text-yellow-600' :
                            'border-[hsl(var(--platform-border))]'
                          }`}
                        >
                          {rec.confidence}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-medium">{rec.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">{rec.summary}</p>
                  {rec.decision_notes && (
                    <p className="text-xs text-[hsl(var(--platform-foreground-muted))] italic">
                      "{rec.decision_notes}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--platform-foreground-muted))]">
                    <span>{formatDate(new Date(rec.created_at), 'MMM d, yyyy')}</span>
                    {rec.estimated_monthly_impact && (
                      <span>
                        Est. impact: {formatCurrencyWhole(rec.estimated_monthly_impact)}/mo
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PlatformPageContainer>
  );
}
