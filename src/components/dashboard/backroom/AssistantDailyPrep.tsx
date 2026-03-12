/**
 * AssistantDailyPrep — Dashboard showing today's appointments requiring color prep.
 * Assistants see upcoming services, suggested formulas, and can start prep tasks.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Beaker, Clock, Play, CheckCircle2, Loader2 } from 'lucide-react';
import { useAssistantDailyPrep, type DailyPrepItem } from '@/hooks/backroom/useAssistantDailyPrep';
import { tokens } from '@/lib/design-tokens';

interface AssistantDailyPrepProps {
  locationId?: string;
  onStartPrep?: (appointmentId: string) => void;
}

export function AssistantDailyPrep({ locationId, onStartPrep }: AssistantDailyPrepProps) {
  const { data: prepItems = [], isLoading } = useAssistantDailyPrep(locationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (prepItems.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Beaker className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No Color Services Today</h3>
        <p className={tokens.empty.description}>
          There are no appointments requiring color prep for today
        </p>
      </div>
    );
  }

  return (
    <Card className="rounded-xl bg-card/80 backdrop-blur-xl border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Beaker className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Today's Color Prep</CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground">
              {prepItems.length} service{prepItems.length !== 1 ? 's' : ''} requiring prep
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {prepItems.map((item) => (
          <PrepItemRow
            key={item.appointmentId}
            item={item}
            onStartPrep={onStartPrep}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PrepItemRow({
  item,
  onStartPrep,
}: {
  item: DailyPrepItem;
  onStartPrep?: (appointmentId: string) => void;
}) {
  const formatTime = (time: string) => {
    // Handle HH:mm:ss or HH:mm format
    const parts = time.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getStatusBadge = () => {
    if (!item.hasExistingSession) return null;
    switch (item.sessionStatus) {
      case 'draft':
        return <Badge variant="outline" className="text-[10px] text-warning border-warning/30">In Prep</Badge>;
      case 'awaiting_stylist_approval':
        return <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Awaiting Review</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-[10px] text-success border-success/30">Done</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{item.sessionStatus}</Badge>;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2 shrink-0">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-sans text-sm tabular-nums text-muted-foreground w-[72px]">
          {formatTime(item.startTime)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm text-foreground truncate">
          {item.serviceName}
        </p>
        <p className="font-sans text-xs text-muted-foreground truncate">
          {item.clientName}
          {item.staffName ? ` · ${item.staffName}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {getStatusBadge()}
        {!item.hasExistingSession && onStartPrep && (
          <Button
            size="sm"
            className="h-8 px-3 font-sans text-sm"
            onClick={() => onStartPrep(item.appointmentId)}
          >
            <Play className="w-3 h-3 mr-1" />
            Start Prep
          </Button>
        )}
        {item.hasExistingSession && item.sessionStatus === 'completed' && (
          <CheckCircle2 className="w-4 h-4 text-success" />
        )}
      </div>
    </div>
  );
}
