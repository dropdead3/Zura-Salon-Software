import { useState, useEffect, useMemo } from 'react';
import { useOrgNow } from '@/hooks/useOrgNow';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarClock, CheckCircle2, Info, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { ScheduleLegend } from './ScheduleLegend';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type UrgencyLevel = 'overdue' | 'nearing';

interface QueueItem {
  appointment: PhorestAppointment;
  urgency: UrgencyLevel;
  /** Positive = minutes overdue; negative = minutes until end */
  overdueMinutes: number;
}

interface ScheduleActionBarProps {
  appointments: PhorestAppointment[];
  onSelectAppointment: (apt: PhorestAppointment) => void;
  todayAppointmentCount?: number;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
}

function buildPaymentQueue(appointments: PhorestAppointment[], nowMinutes: number): QueueItem[] {
  const queue: QueueItem[] = [];

  for (const apt of appointments) {
    if (apt.status !== 'checked_in') continue;

    // Parse end_time (HH:MM) into minutes
    const [h, m] = apt.end_time.split(':').map(Number);
    const endMinutes = h * 60 + m;

    const diffMin = nowMinutes - endMinutes;

    if (diffMin >= 0) {
      // Past end time — overdue
      queue.push({ appointment: apt, urgency: 'overdue', overdueMinutes: diffMin });
    } else if (diffMin >= -15) {
      // Within 15 min of end — nearing checkout
      queue.push({ appointment: apt, urgency: 'nearing', overdueMinutes: diffMin });
    }
  }

  // Sort: overdue first (most overdue at front), then nearing
  queue.sort((a, b) => b.overdueMinutes - a.overdueMinutes);

  return queue;
}

export function ScheduleActionBar({
  appointments,
  onSelectAppointment,
  todayAppointmentCount = 0,
  zoomLevel = 0,
  onZoomIn,
  onZoomOut,
}: ScheduleActionBarProps) {
  const { dashPath } = useOrgDashboardPath();
  const { nowMinutes } = useOrgNow();

  const queue = useMemo(() => buildPaymentQueue(appointments, nowMinutes), [appointments, nowMinutes]);

  return (
    <div
      className={cn(
        'bg-card/80 backdrop-blur-xl border border-border rounded-full px-4 py-2.5 flex items-center gap-3 transition-all duration-300 shadow-lg flex-1'
      )}
    >
      {/* Left: Appointment count */}
      <div className={cn('flex items-center gap-2 shrink-0', tokens.body.muted)}>
        <CalendarDays className="h-4 w-4" />
        <span>
          <span className="font-medium text-foreground">{todayAppointmentCount}</span>
          {' '}appt{todayAppointmentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Center: Payment queue bubbles */}
      <div className="flex-1 min-w-0">
        {queue.length === 0 ? (
          <div className={cn('flex items-center justify-center gap-1.5 py-0.5', tokens.body.muted)}>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-xs">All clear</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                This queue shows clients who are nearing checkout or overdue for payment. When it's empty, all checked-in clients are on track.
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex items-center gap-1.5 px-1">
              {queue.map((item) => (
                <Button
                  key={item.appointment.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectAppointment(item.appointment)}
                  className={cn(
                    'rounded-full h-7 px-3 text-xs shrink-0 gap-1',
                    item.urgency === 'overdue' &&
                      'border-destructive/60 text-destructive hover:bg-destructive/10 dark:border-destructive/40',
                    item.urgency === 'nearing' &&
                      'border-amber-500/60 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950 dark:border-amber-500/40'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      item.urgency === 'overdue' ? 'bg-destructive' : 'bg-amber-500'
                    )}
                  />
                  {getFirstName(item.appointment.client_name)}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Appointments & Transactions link */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={dashPath('/appointments-hub?tab=transactions')}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top">Appointments &amp; Transactions</TooltipContent>
      </Tooltip>

      {/* Zoom Controls */}
      <div className="shrink-0 flex items-center border-l border-border pl-2 gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomOut}
              disabled={zoomLevel <= -3}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded-full transition-colors',
                zoomLevel <= -3 ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomIn}
              disabled={zoomLevel >= 3}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded-full transition-colors',
                zoomLevel >= 3 ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom in</TooltipContent>
        </Tooltip>
      </div>

      {/* Right: Schedule Legend */}
      <div className="shrink-0">
        <ScheduleLegend />
      </div>
    </div>
  );
}
