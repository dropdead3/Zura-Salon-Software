import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users } from 'lucide-react';
import { useStylistReputation } from '@/hooks/useStylistReputation';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';

function scoreBadgeVariant(score: number | null): 'default' | 'secondary' | 'destructive' {
  if (score == null) return 'secondary';
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'destructive';
}

export function StylistReputationCard() {
  const { isEntitled } = useReputationEntitlement();
  const { data, isLoading } = useStylistReputation(90);

  // Silence is valid output: when the org is unsubscribed from Zura Reputation,
  // stylists shouldn't see a paywall they can't act on (Stylist Privacy Contract).
  if (!isEntitled) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">Stylist Reputation</CardTitle>
              <CardDescription>Last 90 days · ratings, NPS, recovery blended</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No stylist feedback yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map((row) => (
              <div
                key={row.staffUserId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{row.staffName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.responseCount} {row.responseCount === 1 ? 'response' : 'responses'}
                    {row.recoveryOpened > 0 && ` · ${row.recoveryResolved}/${row.recoveryOpened} recoveries closed`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{row.avgRating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">NPS {row.nps}</div>
                  {row.reputationScore == null ? (
                    <Badge variant="secondary" className="text-xs">Insufficient data</Badge>
                  ) : (
                    <Badge variant={scoreBadgeVariant(row.reputationScore)} className="text-xs">
                      {row.reputationScore}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
