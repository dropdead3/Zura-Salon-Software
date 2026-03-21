import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Sparkles, Clock, ChevronRight, Star } from 'lucide-react';
import { usePublishedChangelog, useUnreadChangelogCount } from '@/hooks/useChangelog';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export function ChangelogWidget() {
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const { data: entries = [], isLoading } = usePublishedChangelog();
  const { data: unreadCount = 0 } = useUnreadChangelogCount();

  const recentUpdates = entries
    .filter(e => e.entry_type !== 'coming_soon')
    .slice(0, 2);
    
  const topComingSoon = entries
    .filter(e => e.entry_type === 'coming_soon')
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 1);

  if (isLoading) {
    return (
      <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5'}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-3 mt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5'}>
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <Sparkles className={tokens.card.icon} />
        </div>
        <span className={cn(tokens.kpi.label, 'flex-1'}>WHAT'S NEW</span>
      </div>

      <div className="mt-4 flex-1">
        {recentUpdates.length === 0 && topComingSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No updates yet
          </p>
        ) : (
          <div className="space-y-3">
            {recentUpdates.map(entry => (
              <Link
                key={entry.id}
                to={dashPath('/changelog'}
                className="block group"
              >
                <div className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    'p-1.5 rounded-md shrink-0',
                    entry.is_major ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10'
                  )}>
                    {entry.is_major ? (
                      <Star className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      {!entry.is_read && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">NEW</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.version && `${entry.version} • `}
                      {entry.published_at && formatDate(parseISO(entry.published_at), 'MMM d'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}

            {topComingSoon.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Coming Soon</p>
                {topComingSoon.map(entry => (
                  <Link
                    key={entry.id}
                    to={dashPath('/changelog'}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 shrink-0">
                        <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.vote_count || 0} votes
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-2 pt-2 border-t border-border/40 min-h-[28px]">
        <Link 
          to={dashPath('/changelog'}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View All Updates <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  );
}
