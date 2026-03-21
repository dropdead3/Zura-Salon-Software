import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Calendar, Target } from 'lucide-react';
import { useHuddleHistory } from '@/hooks/useHuddles';
import { useFormatDate } from '@/hooks/useFormatDate';

interface HuddleArchiveProps {
  locationId?: string;
  onSelect?: (huddleId: string) => void;
}

export function HuddleArchive({ locationId, onSelect }: HuddleArchiveProps) {
  const { formatDate } = useFormatDate();
  const { data: huddles = [], isLoading } = useHuddleHistory(30, locationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (huddles.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No past huddles yet.</p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3 pr-4">
        {huddles.map((huddle) => (
          <Card
            key={huddle.id}
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSelect?.(huddle.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatDate(new Date(huddle.huddle_date), 'EEEE, MMMM d')}
                </span>
              </div>
              {!huddle.is_published && (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>

            {huddle.focus_of_the_day && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-3 h-3" />
                <span className="truncate">{huddle.focus_of_the_day}</span>
              </div>
            )}

            {huddle.announcements && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {huddle.announcements}
              </p>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
