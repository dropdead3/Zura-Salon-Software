import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Inbox, AlertCircle } from 'lucide-react';
import { useOwnerDecisionsQueue } from '@/hooks/useOwnerDecisionsQueue';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';

/**
 * DecisionsAwaitingSection — Owner-only operator primitive.
 *
 * Surfaces the ranked list of escalations that require the operator's
 * personal attention (time-off, refunds, disputes). Honors the visibility
 * contract: returns null when the queue is empty (no noise).
 *
 * Privacy contract: gated by useIsPrimaryOwner; never rendered for stylists.
 */
export function DecisionsAwaitingSection() {
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();
  const { data: decisions = [], isLoading } = useOwnerDecisionsQueue({
    enabled: isPrimaryOwner,
  });

  if (!isPrimaryOwner) return null;

  // Visibility contract: silence is valid output.
  if (!isLoading && decisions.length === 0) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        '[visibility-contract] suppressed section="decisions_awaiting" reason="queue-empty"',
      );
    }
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Inbox className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">
                Decisions Awaiting You
              </CardTitle>
              <CardDescription className="font-sans text-xs">
                Escalations that need your call — oldest first
              </CardDescription>
            </div>
          </div>
          {!isLoading && decisions.length > 0 && (
            <Badge variant="secondary" className="font-display tracking-wide">
              {decisions.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </>
        ) : (
          decisions.map((d) => {
            const ageDays = Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(d.pendingSince).getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            );
            const isStale = ageDays >= 3;
            return (
              <Button
                key={d.id}
                asChild
                variant="ghost"
                className="w-full h-auto py-3 px-3 justify-between rounded-lg hover:bg-muted/60"
              >
                <Link to={d.href}>
                  <div className="flex items-start gap-3 min-w-0">
                    {isStale ? (
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                    <div className="min-w-0 text-left">
                      <p className="font-sans text-sm text-foreground truncate">
                        {d.title}
                      </p>
                      <p className="font-sans text-xs text-muted-foreground truncate">
                        {d.subtitle}
                        {ageDays > 0 && (
                          <span className="ml-2 text-muted-foreground/70">
                            · {ageDays}d pending
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              </Button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
