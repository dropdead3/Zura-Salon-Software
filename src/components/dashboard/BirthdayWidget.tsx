import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cake, PartyPopper, Eye, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTodaysBirthdays, useUpcomingBirthdays } from '@/hooks/useBirthdays';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { cn, formatDisplayName } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

export function BirthdayWidget() {
  const { data: todaysBirthdays, isLoading: loadingToday } = useTodaysBirthdays();
  const { data: upcomingBirthdays, isLoading: loadingUpcoming } = useUpcomingBirthdays();
  const { isViewingAsUser } = useViewAs();
  const { dashPath } = useOrgDashboardPath();

  const isLoading = loadingToday || loadingUpcoming;

  const nextUpcoming = upcomingBirthdays
    ?.filter(b => b.daysUntil > 0)
    .slice(0, 3) || [];

  if (isLoading) {
    return (
      <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="space-y-2 mt-4">
          <Skeleton className="w-full h-8" />
          <Skeleton className="w-full h-8" />
        </div>
      </Card>
    );
  }

  const hasTodayBirthdays = todaysBirthdays && todaysBirthdays.length > 0;
  const hasUpcoming = nextUpcoming.length > 0;

  return (
    <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <Cake className={tokens.card.icon} />
        </div>
        <span className={cn(tokens.kpi.label, 'flex-1')}>TEAM BIRTHDAYS</span>
      </div>

      <div className="mt-4 flex-1">
        {hasTodayBirthdays && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-pink-500 font-medium mb-2">
              <PartyPopper className="w-3 h-3" />
              <span>Today!</span>
            </div>
            <div className="space-y-2">
              {todaysBirthdays.map((person) => (
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
                    <AvatarFallback className="text-[10px] bg-pink-100 text-pink-700">
                      {formatDisplayName(person.full_name || '', person.display_name)?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate flex items-center gap-1">
                    {formatDisplayName(person.full_name || '', person.display_name)}
                    {isViewingAsUser && person.isCurrentUser && (
                      <Eye className="w-3 h-3 text-primary shrink-0" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasUpcoming && (
          <div>
            {hasTodayBirthdays && (
              <div className="border-t border-border pt-2 mt-2" />
            )}
            <p className="text-xs text-muted-foreground font-display uppercase tracking-wide mb-2">
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
                        {formatDisplayName(person.full_name || '', person.display_name)?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate flex items-center gap-1">
                      {formatDisplayName(person.full_name || '', person.display_name)}
                      {isViewingAsUser && person.isCurrentUser && (
                        <Eye className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasTodayBirthdays && !hasUpcoming && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming birthdays
          </p>
        )}
      </div>

      <div className="flex justify-end mt-2 pt-2 border-t border-border/40 min-h-[28px]">
        <Link
          to={dashPath('/admin/birthdays')}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  );
}
