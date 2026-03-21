import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { Users, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDisplayName } from '@/lib/utils';
import { useAssistantUtilizationStats } from '@/hooks/useAssistantUtilizationStats';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.round(minutes / 60 * 10) / 10;
  return `${hours}h`;
}

export function AssistantUtilizationCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const {
    totalRequests,
    acceptedRequests,
    acceptanceRate,
    totalCoverageMinutes,
    avgResponseMinutes,
    topAssistants,
    isLoading,
  } = useAssistantUtilizationStats(effectiveOrganization?.id || null);

  return (
    <PinnableCard
      elementKey="assistant_utilization"
      elementName="Assistant Utilization"
      category="Analytics Hub - Operations"
    >
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>Assistant Utilization</CardTitle>
                  <MetricInfoTooltip
                    description="Tracks assistant coverage requests, acceptance rates, response times, and total coverage hours over the last 30 days."
                  />
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  Last 30 days
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className={tokens.loading.skeleton} />
              ))}
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className={tokens.label.tiny}>Requests</span>
                  <p className={tokens.stat.large}>{totalRequests}</p>
                </div>
                <div className="space-y-1">
                  <span className={tokens.label.tiny}>Accepted</span>
                  <p className={tokens.stat.large}>
                    {acceptedRequests}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({Math.round(acceptanceRate * 100)}%)
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className={tokens.label.tiny}>Coverage</span>
                  <p className={tokens.stat.large}>{formatHours(totalCoverageMinutes)}</p>
                </div>
                <div className="space-y-1">
                  <span className={tokens.label.tiny}>Avg Response</span>
                  <p className={tokens.stat.large}>{formatResponseTime(avgResponseMinutes)}</p>
                </div>
              </div>

              {/* Top Assistants */}
              {topAssistants.length > 0 && (
                <div>
                  <span className={cn(tokens.label.tiny, 'mb-2 block'}>Top Assistants</span>
                  <div className="space-y-2">
                    {topAssistants.map((assistant, idx) => (
                      <div key={assistant.user_id} className="flex items-center gap-3 py-1.5">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={assistant.photo_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {assistant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(tokens.body.default, 'flex-1 truncate'}>
                          {assistant.name}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {assistant.confirmed_hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {assistant.total_assigned}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalRequests === 0 && (
                <div className={tokens.empty.container}>
                  <Users className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No assistant requests</h3>
                  <p className={tokens.empty.description}>
                    Coverage requests will appear here once team members start using the assistant system.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
