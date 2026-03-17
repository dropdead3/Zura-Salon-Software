import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Target,
  CheckCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import {
  useTodaysHuddle,
  useMyHuddleAcknowledgment,
  useAcknowledgeHuddle,
} from '@/hooks/useHuddles';
import { useFormatDate } from '@/hooks/useFormatDate';

interface TodaysHuddleCardProps {
  locationId?: string;
}

export function TodaysHuddleCard({ locationId }: TodaysHuddleCardProps) {
  const { formatDate } = useFormatDate();
  const { data: huddle, isLoading } = useTodaysHuddle(locationId);
  const { data: acknowledgment } = useMyHuddleAcknowledgment(huddle?.id);
  const acknowledgeHuddle = useAcknowledgeHuddle();

  const hasRead = !!acknowledgment;

  const handleAcknowledge = () => {
    if (huddle && !hasRead) {
      acknowledgeHuddle.mutate(huddle.id);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <DashboardLoader size="sm" className="py-4" />
      </Card>
    );
  }

  if (!huddle) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-display text-sm tracking-wide">DAILY HUDDLE</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          No huddle notes for today yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-sm tracking-wide">DAILY HUDDLE</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date(huddle.huddle_date), 'EEEE, MMMM d')}
            </p>
          </div>
        </div>
        {hasRead && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Read
          </Badge>
        )}
      </div>

      {/* Focus of the day */}
      {huddle.focus_of_the_day && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-display tracking-wide text-primary">
              TODAY'S FOCUS
            </span>
          </div>
          <p className="text-sm font-medium">{huddle.focus_of_the_day}</p>
        </div>
      )}

      {/* Announcements */}
      {huddle.announcements && (
        <div className="mb-4">
          <p className="text-xs font-display tracking-wide text-muted-foreground mb-1">
            ANNOUNCEMENTS
          </p>
          <p className="text-sm">{huddle.announcements}</p>
        </div>
      )}

      {/* Wins from yesterday */}
      {huddle.wins_from_yesterday && (
        <div className="mb-4">
          <p className="text-xs font-display tracking-wide text-muted-foreground mb-1">
            YESTERDAY'S WINS
          </p>
          <p className="text-sm">{huddle.wins_from_yesterday}</p>
        </div>
      )}

      {/* Birthdays/celebrations */}
      {huddle.birthdays_celebrations && (
        <div className="mb-4 p-2 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
          🎉 {huddle.birthdays_celebrations}
        </div>
      )}

      {/* Acknowledge button */}
      {!hasRead && (
        <Button
          className="w-full mt-2"
          onClick={handleAcknowledge}
          disabled={acknowledgeHuddle.isPending}
        >
          {acknowledgeHuddle.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Mark as Read
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      )}
    </Card>
  );
}
