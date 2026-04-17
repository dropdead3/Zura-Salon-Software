import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarClock, ZoomIn, ZoomOut, Plus, Users, FileText, PlayCircle, Clock, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useDebounce } from '@/hooks/use-debounce';
import { useOrgNow } from '@/hooks/useOrgNow';
import { ScheduleLegend } from './ScheduleLegend';
import { NavBadge } from '@/components/dashboard/NavBadge';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface ScheduleActionBarProps {
  appointments: PhorestAppointment[];
  /** All loaded appointments — used for the search index (defaults to `appointments`). */
  searchAppointments?: PhorestAppointment[];
  onSelectAppointment: (apt: PhorestAppointment) => void;
  /** Called when search result is chosen — should jump calendar to that date in day view + open detail. */
  onJumpToAppointment?: (apt: PhorestAppointment) => void;
  todayAppointmentCount?: number;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCreateAppointment?: () => void;
  onOpenBlockManager?: () => void;
  pendingBlockCount?: number;
  onOpenDrafts?: () => void;
  draftCount?: number;
  view?: 'day' | 'week' | 'agenda';
  /** The currently viewed date in the calendar (used to determine if pills are temporally relevant). */
  currentDate?: Date;
}

const MAX_RESULTS = 6;

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDateLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today';
  // Compute "Tomorrow" relative to todayStr (YYYY-MM-DD)
  const today = new Date(todayStr + 'T00:00:00');
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (dateStr === tomorrowStr) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ScheduleActionBar({
  appointments,
  searchAppointments,
  onSelectAppointment,
  onJumpToAppointment,
  todayAppointmentCount = 0,
  zoomLevel = 0,
  onZoomIn,
  onZoomOut,
  onCreateAppointment,
  onOpenBlockManager,
  pendingBlockCount = 0,
  onOpenDrafts,
  draftCount = 0,
  view,
  currentDate,
}: ScheduleActionBarProps) {
  const { dashPath } = useOrgDashboardPath();
  const { todayStr } = useOrgNow();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(query, 200);

  const inSessionCount = useMemo(
    () => appointments.filter(a => a.status === 'checked_in').length,
    [appointments]
  );

  const remainingCount = useMemo(
    () => appointments.filter(a => ['confirmed', 'pending', 'booked'].includes(a.status)).length,
    [appointments]
  );

  const searchPool = searchAppointments ?? appointments;

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (q.length < 2) return [] as PhorestAppointment[];
    const matches = searchPool.filter(a => a.client_name?.toLowerCase().includes(q));

    // Rank: today first (asc by time), then future (chronological), then past (reverse chronological)
    const today: PhorestAppointment[] = [];
    const future: PhorestAppointment[] = [];
    const past: PhorestAppointment[] = [];
    for (const a of matches) {
      if (a.appointment_date === todayStr) today.push(a);
      else if (a.appointment_date > todayStr) future.push(a);
      else past.push(a);
    }
    today.sort((a, b) => a.start_time.localeCompare(b.start_time));
    future.sort((a, b) =>
      a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)
    );
    past.sort((a, b) =>
      b.appointment_date.localeCompare(a.appointment_date) || b.start_time.localeCompare(a.start_time)
    );
    return [...today, ...future, ...past];
  }, [debounced, searchPool, todayStr]);

  const visibleResults = results.slice(0, MAX_RESULTS);
  const overflowCount = Math.max(0, results.length - MAX_RESULTS);
  const showDropdown = open && debounced.trim().length >= 2;

  useEffect(() => {
    setHighlight(0);
  }, [debounced]);

  const handleSelect = useCallback(
    (apt: PhorestAppointment) => {
      if (onJumpToAppointment) onJumpToAppointment(apt);
      else onSelectAppointment(apt);
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    },
    [onJumpToAppointment, onSelectAppointment]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || visibleResults.length === 0) {
      if (e.key === 'Escape') {
        setQuery('');
        setOpen(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, visibleResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const apt = visibleResults[highlight];
      if (apt) handleSelect(apt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setOpen(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-card/80 backdrop-blur-xl border border-border rounded-full pl-2.5 pr-4 py-2.5 flex items-center gap-3 transition-all duration-300 shadow-lg flex-1'
      )}
    >
      {/* Left: Create Appointment button */}
      {onCreateAppointment && (
        <Button
          onClick={onCreateAppointment}
          className="rounded-full h-9 px-5 text-sm shrink-0 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      )}

      {/* Appointment count */}
      <div className={cn('flex items-center gap-2 shrink-0', tokens.body.muted)}>
        <CalendarDays className="h-4 w-4" />
        <span>
          <span className="font-medium text-foreground">{todayAppointmentCount}</span>
          {' '}appt{todayAppointmentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Day view only: in-session + remaining counts */}
      {view === 'day' && (
        <>
          <div className={cn('flex items-center gap-2 shrink-0', tokens.body.muted)}>
            <PlayCircle className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">{inSessionCount}</span>
              {' '}in session
            </span>
          </div>
          <div className={cn('flex items-center gap-2 shrink-0', tokens.body.muted)}>
            <Clock className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">{remainingCount}</span>
              {' '}remaining
            </span>
          </div>
        </>
      )}

      {/* Center: Client search */}
      <div className="flex-1 min-w-0 flex justify-center">
        <Popover open={showDropdown} onOpenChange={(o) => { if (!o) setOpen(false); }}>
          <PopoverAnchor asChild>
            <div className="relative w-full max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
                onKeyDown={handleKeyDown}
                placeholder="Search client..."
                className={cn(
                  'h-8 w-full rounded-full bg-muted/60 border border-border/60 pl-8 pr-8 text-sm font-sans',
                  'placeholder:text-muted-foreground/70',
                  'focus-visible:outline-none focus-visible:border-foreground/30 focus-visible:bg-background',
                  'transition-colors'
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="center"
            sideOffset={8}
            className="w-[360px] p-1"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {visibleResults.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No appointments found for "{debounced.trim()}"
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {visibleResults.map((apt, idx) => {
                  const dateLabel = formatDateLabel(apt.appointment_date, todayStr);
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => handleSelect(apt)}
                      onMouseEnter={() => setHighlight(idx)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md flex flex-col gap-0.5 transition-colors',
                        highlight === idx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{apt.client_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {dateLabel} · {formatTime12h(apt.start_time)}
                        </span>
                      </div>
                      {apt.service_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {apt.service_name}
                        </span>
                      )}
                    </button>
                  );
                })}
                {overflowCount > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border mt-1">
                    +{overflowCount} more — refine your search
                  </div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Assistant Blocks */}
      {onOpenBlockManager && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenBlockManager}
              className="relative shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              {pendingBlockCount > 0 && (
                <NavBadge count={pendingBlockCount} className="absolute -top-1 -right-1" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {pendingBlockCount > 0 ? `${pendingBlockCount} pending assist${pendingBlockCount > 1 ? 's' : ''}` : 'Assistant Blocks'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Drafts */}
      {onOpenDrafts && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenDrafts}
              className="relative shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              {draftCount > 0 && (
                <NavBadge count={draftCount} className="absolute -top-1 -right-1" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {draftCount > 0 ? `${draftCount} draft${draftCount > 1 ? 's' : ''}` : 'No drafts'}
          </TooltipContent>
        </Tooltip>
      )}

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
      <div className="shrink-0 flex items-center border-l border-border pl-2 gap-1">
        {(() => {
          const ZOOM_LABELS: Record<number, string> = { '-3': '1hr', '-2': '1hr', '-1': '30m', '0': '20m', '1': '15m', '2': '10m', '3': '5m' };
          return (
            <span className="text-xs text-muted-foreground font-sans min-w-[32px] text-center select-none">
              {ZOOM_LABELS[zoomLevel] ?? '20m'}
            </span>
          );
        })()}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomOut}
              disabled={zoomLevel <= -3}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-full transition-colors',
                zoomLevel <= -3 ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <ZoomOut className="h-4 w-4" />
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
                'h-8 w-8 flex items-center justify-center rounded-full transition-colors',
                zoomLevel >= 3 ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <ZoomIn className="h-4 w-4" />
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
