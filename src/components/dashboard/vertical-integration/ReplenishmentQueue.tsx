import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Check, X } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useReplenishmentEvents, useUpdateReplenishmentEvent } from '@/hooks/useAutoReplenishment';
import { Loader2 } from 'lucide-react';

interface ReplenishmentQueueProps {
  organizationId: string | undefined;
}

const statusColors: Record<string, string> = {
  suggested: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  ordered: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

export function ReplenishmentQueue({ organizationId }: ReplenishmentQueueProps) {
  const { data: events, isLoading } = useReplenishmentEvents(organizationId, 'suggested');
  const updateEvent = useUpdateReplenishmentEvent(organizationId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Replenishment Queue</CardTitle>
              <CardDescription>Auto-triggered reorder suggestions awaiting approval</CardDescription>
            </div>
          </div>
          {events && events.length > 0 && (
            <Badge variant="secondary" className="font-display text-xs tracking-wide">
              {events.length} PENDING
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : !events || events.length === 0 ? (
          <div className={tokens.empty.container}>
            <Package className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No pending replenishments</h3>
            <p className={tokens.empty.description}>
              Auto-replenishment events will appear here when inventory thresholds are triggered
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(tokens.body.default, 'font-medium')}>
                      {event.product_id}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', statusColors[event.status])}
                    >
                      {event.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className={tokens.label.default}>
                    {event.supplier_name} · {event.recommended_qty} units · {event.trigger_reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() =>
                      updateEvent.mutate({ eventId: event.id, status: 'dismissed' })
                    }
                    disabled={updateEvent.isPending}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      updateEvent.mutate({ eventId: event.id, status: 'approved' })
                    }
                    disabled={updateEvent.isPending}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
