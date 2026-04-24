import { useFormatDate } from '@/hooks/useFormatDate';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientVisit } from '@/hooks/useClientVisitHistory';
import { groupClientVisits, type ClientVisitGroup } from '@/lib/client-visit-grouping';
import { formatCurrencyWhole } from '@/lib/formatCurrency';
import { EmptyState } from '@/components/ui/empty-state';

interface VisitHistoryTimelineProps {
  visits: ClientVisit[];
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  completed: { icon: CheckCircle, color: 'text-success-foreground', label: 'Completed' },
  confirmed: { icon: CheckCircle, color: 'text-primary', label: 'Confirmed' },
  checked_in: { icon: CheckCircle, color: 'text-primary', label: 'Checked In' },
  booked: { icon: Calendar, color: 'text-muted-foreground', label: 'Booked' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelled' },
  no_show: { icon: AlertCircle, color: 'text-destructive', label: 'No Show' },
};

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function VisitHistoryTimeline({ visits, isLoading }: VisitHistoryTimelineProps) {
  const { formatDate } = useFormatDate();
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No visit history"
        description="No visits have been recorded for this client yet."
        className="py-10"
      />
    );
  }

  // Group services into visits (Phorest-style: one card per contiguous visit).
  // Sort newest-first for display.
  const grouped = groupClientVisits(visits).sort((a, b) => {
    if (a.appointment_date !== b.appointment_date) {
      return b.appointment_date.localeCompare(a.appointment_date);
    }
    return b.start_time.localeCompare(a.start_time);
  });

  // Bucket visits by date (so the date header still anchors the timeline).
  const visitsByDate = grouped.reduce((acc, group) => {
    if (!acc[group.appointment_date]) acc[group.appointment_date] = [];
    acc[group.appointment_date].push(group);
    return acc;
  }, {} as Record<string, ClientVisitGroup[]>);

  return (
    <div className="space-y-4">
      {Object.entries(visitsByDate).map(([date, dateVisits]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDate(new Date(date), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <div className="space-y-2 ml-6 border-l-2 border-muted pl-4">
            {dateVisits.map(group => (
              <VisitGroupCard key={group.visit_id} group={group} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VisitGroupCard({ group }: { group: ClientVisitGroup }) {
  const statusConfig = STATUS_CONFIG[group.status] || STATUS_CONFIG.booked;
  const StatusIcon = statusConfig.icon;
  const isCancelled = group.status === 'cancelled';
  const isNoShow = group.status === 'no_show';

  if (!group.is_multi_service) {
    // Single-service visit — preserve original card shape exactly.
    const visit = group.members[0];
    return (
      <Card className={cn(
        'p-3',
        isCancelled && 'opacity-60',
        isNoShow && 'border-destructive/20 dark:border-destructive/30',
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium text-sm', isCancelled && 'line-through')}>
              {visit.service_name}
            </p>
            {visit.service_category && (
              <Badge variant="outline" className="text-xs mt-1">
                {visit.service_category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
            <span className={cn('text-xs', statusConfig.color)}>{statusConfig.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime12h(visit.start_time)} - {formatTime12h(visit.end_time)}
          </span>
          {visit.stylist_name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {visit.stylist_name}
            </span>
          )}
          {visit.total_price !== null && visit.total_price > 0 && (
            <span className="font-medium text-foreground">
              {formatCurrencyWhole(visit.total_price)}
            </span>
          )}
        </div>

        {visit.notes && (
          <p className="text-xs text-muted-foreground mt-2 italic">{visit.notes}</p>
        )}
      </Card>
    );
  }

  // Multi-service visit — one card with stacked sub-rows.
  return (
    <Card className={cn(
      'p-3',
      isCancelled && 'opacity-60',
      isNoShow && 'border-destructive/20 dark:border-destructive/30',
    )}>
      {/* Visit header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-primary/70" />
            <span className="font-medium text-sm">
              Visit · {group.members.length} services
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime12h(group.start_time)} - {formatTime12h(group.end_time)}
            </span>
            <span>{group.total_duration_minutes} min</span>
            {group.total_price !== null && group.total_price > 0 && (
              <span className="font-medium text-foreground">
                {formatCurrencyWhole(group.total_price)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
          <span className={cn('text-xs', statusConfig.color)}>{statusConfig.label}</span>
        </div>
      </div>

      {/* Sub-rows: one per service */}
      <div className="mt-3 space-y-2 border-t border-border/40 pt-2">
        {group.members.map((service, idx) => {
          const serviceCancelled = service.status === 'cancelled';
          return (
            <div
              key={service.id}
              className={cn(
                'flex items-start justify-between gap-2 text-xs',
                idx > 0 && 'pt-2 border-t border-border/20',
                serviceCancelled && 'opacity-60',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn('text-foreground font-sans', serviceCancelled && 'line-through')}>
                  {service.service_name}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-muted-foreground">
                  <span>{formatTime12h(service.start_time)}</span>
                  {service.stylist_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {service.stylist_name}
                    </span>
                  )}
                  {service.total_price !== null && service.total_price > 0 && (
                    <span className="text-foreground">
                      {formatCurrencyWhole(service.total_price)}
                    </span>
                  )}
                </div>
              </div>
              {service.service_category && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {service.service_category}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {group.combined_notes && (
        <p className="text-xs text-muted-foreground mt-2 italic border-t border-border/40 pt-2">
          {group.combined_notes}
        </p>
      )}
    </Card>
  );
}
