import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Cake, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  PartyPopper,
  Gift,
  Bell,
  Eye
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  getDay,
  isToday
} from 'date-fns';
import { useMonthlyBirthdays, useTodaysBirthdays, useUpcomingBirthdays } from '@/hooks/useBirthdays';
import { cn } from '@/lib/utils';
import { useViewAs } from '@/contexts/ViewAsContext';

export function BirthdayCalendarCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: monthlyBirthdays, isLoading: loadingMonthly } = useMonthlyBirthdays(currentMonth);
  const { data: todaysBirthdays, isLoading: loadingToday } = useTodaysBirthdays();
  const { data: upcomingBirthdays, isLoading: loadingUpcoming } = useUpcomingBirthdays(14);
  const { isViewingAsUser } = useViewAs();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDayOfWeek = getDay(monthStart);
  const calendarDays = [...Array(startDayOfWeek).fill(null), ...days];

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Get birthdays within 3 days for notification badge
  const urgentBirthdays = upcomingBirthdays?.filter(p => p.daysUntil <= 3) || [];

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-500" />
                Team Birthdays
                {urgentBirthdays.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 text-xs"
                  >
                    <Bell className="w-3 h-3 mr-1" />
                    {urgentBirthdays.length} soon
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Quick preview of upcoming */}
                {!isOpen && upcomingBirthdays && upcomingBirthdays.length > 0 && (
                  <div className="flex -space-x-2 mr-2">
                    {upcomingBirthdays.slice(0, 3).map(person => (
                      <Avatar key={person.id} className="w-6 h-6 border-2 border-background">
                        <AvatarImage src={person.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(person.display_name || person.full_name)?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {upcomingBirthdays.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background">
                        +{upcomingBirthdays.length - 3}
                      </div>
                    )}
                  </div>
                )}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Today's Birthdays Banner */}
            {!loadingToday && todaysBirthdays && todaysBirthdays.length > 0 && (
              <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 border border-pink-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <PartyPopper className="w-4 h-4 text-pink-500" />
                  <span className="font-medium text-sm">
                    🎉 Today's Birthday{todaysBirthdays.length > 1 ? 's' : ''}!
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todaysBirthdays.map(person => (
                    <div 
                      key={person.id} 
                      className={cn(
                        "flex items-center gap-2 bg-background/80 rounded-full pl-1 pr-3 py-1",
                        isViewingAsUser && person.isCurrentUser && "ring-2 ring-primary bg-primary/10"
                      )}
                    >
                      <Avatar className={cn(
                        "w-5 h-5",
                        isViewingAsUser && person.isCurrentUser && "ring-2 ring-primary"
                      )}>
                        <AvatarImage src={person.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(person.display_name || person.full_name)?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium flex items-center gap-1">
                        {person.display_name || person.full_name}
                        {isViewingAsUser && person.isCurrentUser && <Eye className="w-3 h-3 text-primary" />}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousMonth}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size={tokens.button.inline} className="h-7 px-2 text-xs" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Compact Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">
                  {day}
                </div>
              ))}
              
              {loadingMonthly ? (
                Array(35).fill(0).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded" />
                ))
              ) : (
                calendarDays.map((day, i) => {
                  if (!day) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }
                  
                  const dayNum = day.getDate();
                  const birthdaysThisDay = monthlyBirthdays?.[dayNum] || [];
                  const hasBirthday = birthdaysThisDay.length > 0;
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "aspect-square rounded flex items-center justify-center relative text-xs transition-colors",
                        isCurrentDay && "bg-primary text-primary-foreground font-medium",
                        hasBirthday && !isCurrentDay && "bg-pink-500/20 text-pink-600 font-medium",
                        !hasBirthday && !isCurrentDay && "hover:bg-muted/50"
                      )}
                      title={hasBirthday ? birthdaysThisDay.map(p => p.display_name || p.full_name).join(', ') : undefined}
                    >
                      {dayNum}
                      {hasBirthday && (
                        <span className={cn(
                          "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                          isCurrentDay ? "bg-primary-foreground" : "bg-pink-500"
                        )} />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Upcoming Birthdays List - Compact */}
            {!loadingUpcoming && upcomingBirthdays && upcomingBirthdays.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Coming Up
                </h4>
                <div className="space-y-1.5">
                  {upcomingBirthdays.slice(0, 4).map(person => (
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
                        <AvatarFallback className="text-[10px]">
                          {(person.display_name || person.full_name)?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate flex items-center gap-1">
                          {person.display_name || person.full_name}
                          {isViewingAsUser && person.isCurrentUser && <Eye className="w-3 h-3 text-primary shrink-0" />}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] shrink-0 px-1.5 py-0",
                          person.daysUntil <= 1 && "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
                          person.daysUntil <= 3 && person.daysUntil > 1 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        )}
                      >
                        {person.daysUntil === 0 ? 'Today!' : 
                         person.daysUntil === 1 ? 'Tomorrow' : 
                         `${person.daysUntil}d`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
