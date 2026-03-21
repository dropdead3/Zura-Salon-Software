import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useTodaysQueue } from '@/hooks/useTodaysQueue';
import { MobileAgendaCard } from './MobileAgendaCard';
import { cn } from '@/lib/utils';

interface MobileScheduleViewProps {
  locationId?: string;
  userId?: string;
}

export function MobileScheduleView({ locationId, userId }: MobileScheduleViewProps) {
  const { formatDate } = useFormatDate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { data, isLoading, refetch, isRefetching } = useTodaysQueue(locationId);

  // Combine all appointments from the queue data
  const allAppointments = useMemo(() => {
    if (!data) return [];
    return [
      ...data.waiting,
      ...data.inService,
      ...data.upcoming,
      ...data.completed,
      ...data.noShows,
    ];
  }, [data]);

  // Filter by user if provided
  const filteredAppointments = useMemo(() => {
    if (!userId) return allAppointments;
    return allAppointments.filter(apt => apt.stylist_user_id === userId);
  }, [allAppointments, userId]);

  // Group appointments by status
  const { upcoming, inProgress, completed, noShow } = useMemo(() => {
    return {
      upcoming: filteredAppointments.filter(a => 
        ['confirmed', 'pending'].includes(a.status || '')
      ),
      inProgress: filteredAppointments.filter(a => 
        a.status === 'checked_in' || a.status === 'in_progress'
      ),
      completed: filteredAppointments.filter(a => 
        a.status === 'completed'
      ),
      noShow: filteredAppointments.filter(a => 
        a.status === 'no_show' || a.status === 'cancelled'
      ),
    };
  }, [filteredAppointments]);

  const navigateDate = (direction: 'prev' | 'next') => {
    // Note: Currently the queue hook only supports today
    // This is placeholder for future date navigation
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getDateLabel = () => {
    const today = new Date();
    if (isToday(today)) return 'Today';
    if (isTomorrow(today)) return 'Tomorrow';
    return formatDate(today, 'EEEE');
  };

  const dateString = format(new Date(), 'yyyy-MM-dd');

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Date Navigation Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-lg font-medium">{getDateLabel()}</h1>
            <p className="text-xs text-muted-foreground">
              {formatDate(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate('next')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{upcoming.length} upcoming</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span>{inProgress.length} in service</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span>{completed.length} done</span>
          </div>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {isRefetching && (
        <div className="flex items-center justify-center py-2 bg-muted/30">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs text-muted-foreground">Refreshing...</span>
        </div>
      )}

      {/* Appointments List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* In Progress Section */}
          {inProgress.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default" className="bg-blue-500">
                  <User className="h-3 w-3 mr-1" />
                  In Service
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {inProgress.length}
                </span>
              </div>
              <div className="space-y-2">
                {inProgress.map((apt) => (
                  <MobileAgendaCard
                    key={apt.id}
                    appointment={apt}
                    onRefresh={refetch}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Section */}
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Upcoming
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {upcoming.length}
                </span>
              </div>
              <div className="space-y-2">
                {upcoming.map((apt) => (
                  <MobileAgendaCard
                    key={apt.id}
                    appointment={apt}
                    onRefresh={refetch}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Section */}
          {completed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {completed.length}
                </span>
              </div>
              <div className="space-y-2">
                {completed.map((apt) => (
                  <MobileAgendaCard
                    key={apt.id}
                    appointment={apt}
                    onRefresh={refetch}
                    isCompleted
                  />
                ))}
              </div>
            </section>
          )}

          {/* No Show / Cancelled Section */}
          {noShow.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="destructive" className="bg-destructive/10 text-destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Cancelled / No-Show
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {noShow.length}
                </span>
              </div>
              <div className="space-y-2 opacity-60">
                {noShow.map((apt) => (
                  <MobileAgendaCard
                    key={apt.id}
                    appointment={apt}
                    onRefresh={refetch}
                    isCompleted
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {filteredAppointments.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium text-muted-foreground">
                No appointments
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {isToday(selectedDate)
                  ? "You're all clear for today"
                  : `No appointments scheduled for ${formatDate(selectedDate, 'MMM d')}`}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
