import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Star, Eye } from 'lucide-react';
import { useTodaysAnniversaries, useUpcomingAnniversaries, MILESTONE_YEARS } from '@/hooks/useAnniversaries';
import { useBusinessName } from '@/hooks/useBusinessSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewAs } from '@/contexts/ViewAsContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';

export function AnniversaryWidget() {
  const { data: todaysAnniversaries, isLoading: loadingToday } = useTodaysAnniversaries();
  const { data: upcomingAnniversaries, isLoading: loadingUpcoming } = useUpcomingAnniversaries(30);
  const { isViewingAsUser } = useViewAs();

  const isLoading = loadingToday || loadingUpcoming;

  const nextUpcoming = upcomingAnniversaries
    ?.filter(a => a.daysUntil > 0)
    .slice(0, 3) || [];

  if (isLoading) {
    return (
      <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-32 h-4" />
        </div>
        <div className="space-y-2 mt-4">
          <Skeleton className="w-full h-8" />
          <Skeleton className="w-full h-8" />
        </div>
      </Card>
    );
  }

  const hasTodayAnniversaries = todaysAnniversaries && todaysAnniversaries.length > 0;
  const hasUpcoming = nextUpcoming.length > 0;

  const isMilestone = (years: number) => MILESTONE_YEARS.includes(years);

  return (
    <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <Award className={tokens.card.icon} />
        </div>
        <span className={cn(tokens.kpi.label, 'flex-1')}>WORK ANNIVERSARIES</span>
      </div>

      <div className="mt-4 flex-1">
        {hasTodayAnniversaries && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-amber-500 font-medium mb-2">
              <Star className="w-3 h-3" />
              <span>Today!</span>
            </div>
            <div className="space-y-2">
              {todaysAnniversaries.map((person) => (
                <div 
                  key={person.id} 
                  className={cn(
                    "flex items-center gap-2 p-1.5 rounded-md -mx-1.5",
                    isViewingAsUser && person.isCurrentUser && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  <Avatar className={cn(
                    "w-6 h-6",
                    isViewingAsUser && person.isCurrentUser && "ring-2 ring-primary"
                  )}>
                    <AvatarImage src={person.photo_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                      {(person.display_name || person.full_name)?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">
                      {person.display_name || person.full_name}
                    </span>
                    {isViewingAsUser && person.isCurrentUser && (
                      <Eye className="w-3 h-3 text-primary shrink-0" />
                    )}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-[10px] px-1.5 shrink-0",
                      isMilestone(person.years) 
                        ? "bg-amber-100 text-amber-700 border-amber-200" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {person.years}yr{person.years > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasUpcoming && (
          <div>
            {hasTodayAnniversaries && (
              <div className="border-t border-border pt-2 mt-2" />
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Coming Up
            </p>
            <div className="space-y-1.5">
              {nextUpcoming.map((person) => (
                <div 
                  key={person.id} 
                  className={cn(
                    "flex items-center justify-between gap-2 p-1.5 rounded-md -mx-1.5",
                    isViewingAsUser && person.isCurrentUser && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className={cn(
                      "w-5 h-5",
                      isViewingAsUser && person.isCurrentUser && "ring-2 ring-primary"
                    )}>
                      <AvatarImage src={person.photo_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-muted">
                        {(person.display_name || person.full_name)?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate flex items-center gap-1">
                      {person.display_name || person.full_name}
                      {isViewingAsUser && person.isCurrentUser && (
                        <Eye className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] px-1 py-0",
                        isMilestone(person.years) 
                          ? "bg-amber-100 text-amber-700" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {person.years}yr
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil}d`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasTodayAnniversaries && !hasUpcoming && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming anniversaries
          </p>
        )}
      </div>
    </Card>
  );
}
