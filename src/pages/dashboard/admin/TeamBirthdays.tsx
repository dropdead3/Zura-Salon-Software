import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ArrowLeft, Award, Cake, Calendar, ChevronLeft, ChevronRight, Info, PartyPopper, Star, Users } from 'lucide-react';
import { useMonthlyBirthdays, useUpcomingBirthdays, useTodaysBirthdays } from '@/hooks/useBirthdays';
import { useTodaysAnniversaries, useUpcomingAnniversaries, MILESTONE_YEARS } from '@/hooks/useAnniversaries';
import { useBusinessName } from '@/hooks/useBusinessSettings';
import { addMonths, subMonths, getMonth, getDate, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/hooks/useUserRoles';
import { BirthdayExportButton } from '@/components/dashboard/BirthdayExportButton';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TeamBirthdays() {
  const { formatDate } = useFormatDate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: todaysBirthdays, isLoading: loadingToday } = useTodaysBirthdays();
  const { data: upcomingBirthdays, isLoading: loadingUpcoming } = useUpcomingBirthdays(365); // Full year
  const { data: thisMonthBirthdays, isLoading: loadingThisMonth } = useMonthlyBirthdays(currentMonth);
  
  // Anniversary hooks
  const { data: todaysAnniversaries, isLoading: loadingTodayAnniversaries } = useTodaysAnniversaries();
  const { data: upcomingAnniversaries, isLoading: loadingUpcomingAnniversaries } = useUpcomingAnniversaries(365);
  
  // Business name for tooltip
  const businessName = useBusinessName();
  
  const nextMonth = addMonths(currentMonth, 1);
  const { data: nextMonthBirthdays, isLoading: loadingNextMonth } = useMonthlyBirthdays(nextMonth);

  // Count birthdays this month
  const thisMonthCount = thisMonthBirthdays 
    ? Object.values(thisMonthBirthdays).flat().length 
    : 0;
  
  // Count birthdays next month
  const nextMonthCount = nextMonthBirthdays 
    ? Object.values(nextMonthBirthdays).flat().length 
    : 0;

  // Get next 3 upcoming birthdays (excluding today)
  const next3UpcomingBirthdays = upcomingBirthdays?.filter(b => b.daysUntil > 0).slice(0, 3) || [];
  
  // Get next 5 upcoming anniversaries (excluding today)
  const next5UpcomingAnniversaries = upcomingAnniversaries?.filter(a => a.daysUntil > 0).slice(0, 5) || [];

  const isLoading = loadingToday || loadingUpcoming || loadingThisMonth || loadingNextMonth || loadingTodayAnniversaries || loadingUpcomingAnniversaries;

  // Calendar rendering
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const today = new Date();
  const isCurrentMonth = getMonth(currentMonth) === getMonth(today) && 
                         currentMonth.getFullYear() === today.getFullYear();

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <DashboardPageHeader
          title="Team Birthdays & Anniversaries"
          description="Celebrate your team members' special days and milestones"
          actions={
            <BirthdayExportButton birthdays={upcomingBirthdays || []} />
          }
        />

        {/* Today's Birthdays Banner */}
        {todaysBirthdays && todaysBirthdays.length > 0 && (
          <Card className="bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <PartyPopper className="w-6 h-6" />
                <h2 className="font-display text-lg tracking-wide">
                  🎂 TODAY'S BIRTHDAY{todaysBirthdays.length > 1 ? 'S' : ''}!
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                {todaysBirthdays.map((person) => (
                  <div 
                    key={person.id}
                    className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full pl-2 pr-4 py-2"
                  >
                    <Avatar className="w-10 h-10 border-2 border-white/50">
                      <AvatarImage src={person.photo_url || undefined} />
                      <AvatarFallback className="bg-white/30 text-white">
                        {(person.display_name || person.full_name)?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {person.display_name || person.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* This Month Count */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-display">{thisMonthCount}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Birthdays in {formatDate(currentMonth, 'MMMM')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Month Count */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-display">{nextMonthCount}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Birthdays in {formatDate(nextMonth, 'MMMM')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Team */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-display">{upcomingBirthdays?.length || 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Team members with birthdays
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Anniversaries Section - Moved to top */}
        <div className="space-y-6">
          {/* Today's Anniversaries Banner */}
          {todaysAnniversaries && todaysAnniversaries.length > 0 && (
            <Card className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6" />
                  <h2 className="font-display text-lg tracking-wide">
                    🎉 WORK ANNIVERSARY TODAY!
                  </h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {todaysAnniversaries.map((person) => (
                    <div 
                      key={person.id}
                      className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full pl-2 pr-4 py-2"
                    >
                      <Avatar className="w-10 h-10 border-2 border-white/50">
                        <AvatarImage src={person.photo_url || undefined} />
                        <AvatarFallback className="bg-white/30 text-white">
                          {(person.display_name || person.full_name)?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {person.display_name || person.full_name} — {person.years} year{person.years > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Anniversaries */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wide text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                UPCOMING WORK ANNIVERSARIES
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    Work anniversaries are to celebrate the length of time a stylist has worked at {businessName}
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : next5UpcomingAnniversaries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {next5UpcomingAnniversaries.map((person) => {
                    const isMilestone = MILESTONE_YEARS.includes(person.years);
                    return (
                      <div 
                        key={person.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          isMilestone
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                            : "bg-muted/50 border-border"
                        )}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={person.photo_url || undefined} />
                          <AvatarFallback className="bg-amber-100 text-amber-800">
                            {(person.display_name || person.full_name)?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate flex items-center gap-1">
                            {person.display_name || person.full_name}
                            {isMilestone && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {person.years} year{person.years > 1 ? 's' : ''} • {formatDate(person.anniversaryDate, 'MMM d')}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "shrink-0",
                            person.daysUntil === 1 && "border-orange-500 text-orange-600",
                            person.daysUntil <= 7 && person.daysUntil > 1 && "border-amber-500 text-amber-600"
                          )}
                        >
                          {person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming anniversaries
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display tracking-wide">
                  {formatDate(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }
                  
                  const hasBirthday = thisMonthBirthdays && thisMonthBirthdays[day];
                  const isToday = isCurrentMonth && day === today.getDate();
                  const birthdayPeople = hasBirthday ? thisMonthBirthdays[day] : [];
                  
                  return (
                    <div
                      key={day}
                      className={cn(
                        "aspect-square p-1 rounded-lg relative flex flex-col items-center justify-start",
                        isToday && "bg-primary/10 ring-2 ring-primary",
                        hasBirthday && !isToday && "bg-pink-50 dark:bg-pink-950/30"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium",
                        isToday && "text-primary"
                      )}>
                        {day}
                      </span>
                      {hasBirthday && (
                        <div className="flex -space-x-1 mt-1">
                          {birthdayPeople.slice(0, 3).map((person) => (
                            <HoverCard key={person.id} openDelay={100} closeDelay={50}>
                              <HoverCardTrigger asChild>
                                <Avatar className="w-5 h-5 border border-background cursor-pointer hover:z-10 hover:scale-110 transition-transform">
                                  <AvatarImage src={person.photo_url || undefined} />
                                  <AvatarFallback className="text-[8px] bg-pink-200 text-pink-800">
                                    {(person.display_name || person.full_name)?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-auto p-3" side="top">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={person.photo_url || undefined} />
                                    <AvatarFallback className="bg-pink-100 text-pink-800">
                                      {(person.display_name || person.full_name)?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {person.display_name || person.full_name}
                                    </p>
                                    {person.roles && person.roles.length > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        {person.roles.map(role => ROLE_LABELS[role] || role).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          ))}
                          {birthdayPeople.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] border border-background cursor-pointer">
                                  +{birthdayPeople.length - 3}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  {birthdayPeople.slice(3).map(p => (
                                    <p key={p.id} className="text-xs">
                                      {p.display_name || p.full_name}
                                    </p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Birthdays */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wide text-sm">
                NEXT 3 UPCOMING BIRTHDAYS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : next3UpcomingBirthdays.length > 0 ? (
                next3UpcomingBirthdays.map((person) => (
                  <div 
                    key={person.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={person.photo_url || undefined} />
                      <AvatarFallback className="bg-pink-100 text-pink-800">
                        {(person.display_name || person.full_name)?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {person.display_name || person.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(person.nextBirthday, 'MMMM d')}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0",
                        person.daysUntil === 1 && "border-orange-500 text-orange-600",
                        person.daysUntil <= 3 && person.daysUntil > 1 && "border-amber-500 text-amber-600"
                      )}
                    >
                      {person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming birthdays
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
