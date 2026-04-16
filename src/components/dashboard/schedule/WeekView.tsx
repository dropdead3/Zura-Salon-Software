import { useState, useMemo, useRef, useEffect } from 'react';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { isClosedOnDate, getLocationHoursForDate, type HoursJson, type HolidayClosure } from '@/hooks/useLocations';
import { 
  format, 
  addDays, 
} from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { cn, formatDisplayName } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { Users } from 'lucide-react';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/design-tokens';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';
import type { AssistantProfile } from '@/hooks/useAppointmentAssistantNames';
import { AppointmentCardContent, getCardSize } from './AppointmentCardContent';

interface WeekViewProps {
  currentDate: Date;
  appointments: PhorestAppointment[];
  hoursStart?: number;
  hoursEnd?: number;
  zoomLevel?: number;
  onAppointmentClick: (appointment: PhorestAppointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
  selectedLocationId?: string;
  onDayDoubleClick?: (date: Date) => void;
  locationHoursJson?: HoursJson | null;
  locationHolidayClosures?: HolidayClosure[] | null;
  assistedAppointmentIds?: Set<string>;
  appointmentsWithAssistants?: Set<string>;
  colorBy?: 'status' | 'service' | 'stylist';
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  assistantProfilesMap?: Map<string, AssistantProfile[]>;
  assistantTimeBlocks?: AssistantTimeBlock[];
}

// Use consolidated status colors from design tokens
const STATUS_COLORS = APPOINTMENT_STATUS_COLORS;

const ZOOM_CONFIG: Record<string, { interval: number }> = {
  '-3': { interval: 60 },
  '-2': { interval: 60 },
  '-1': { interval: 30 },
  '0':  { interval: 20 },
  '1':  { interval: 15 },
  '2':  { interval: 10 },
  '3':  { interval: 5 },
};

const MIN_ROW_HEIGHT = 20;

import { parseTimeToMinutes, formatTime12h, getEventStyle, getOverlapInfo } from '@/lib/schedule-utils';

function WeekSlot({
  hour,
  minute,
  isHour,
  isHalf,
  isPastSlot,
  isOutsideHours,
  rowHeight,
  slotInterval,
  onClick,
}: {
  hour: number;
  minute: number;
  isHour: boolean;
  isHalf: boolean;
  isPastSlot: boolean;
  isOutsideHours: boolean;
  rowHeight: number;
  slotInterval: number;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const showBadge = isHovered && (isPastSlot || !isOutsideHours);
  const badgeLabel = isPastSlot
    ? 'Unavailable'
    : formatTime12h(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

  return (
    <div
      className={cn(
        'cursor-pointer transition-colors group relative',
        isPastSlot && 'bg-muted/40',
        !isPastSlot && !isOutsideHours && 'hover:bg-primary/10',
        isHour
          ? 'border-t border-border/80 dark:border-border/60'
          : isHalf && slotInterval <= 30
            ? 'border-t border-dashed border-border/70 dark:border-border/40'
            : 'border-t border-dotted border-border/50 dark:border-border/25'
      )}
      style={{
        height: rowHeight,
        ...(!isPastSlot && isOutsideHours ? {
          background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.08) 4px, hsl(var(--muted-foreground) / 0.08) 5px)`,
        } : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showBadge && (
        <div
          className={cn(
            'pointer-events-none absolute left-1/2 -top-8 z-40 w-max max-w-[calc(100%-8px)] -translate-x-1/2 truncate rounded px-2 py-1 text-center text-xs font-display font-medium tracking-wide shadow',
            isPastSlot ? 'bg-muted-foreground text-white' : 'bg-foreground text-background'
          )}
        >
          {badgeLabel}
        </div>
      )}
    </div>
  );
}

function WeekAppointmentCard({
  appointment,
  hoursStart,
  slotInterval,
  rowHeight,
  onClick,
  categoryColors,
  isAssisting = false,
  hasAssistants = false,
  colorBy = 'service',
  serviceLookup,
  assistantNamesMap,
  assistantProfilesMap,
  columnIndex = 0,
  totalOverlapping = 1,
}: {
  appointment: PhorestAppointment;
  hoursStart: number;
  slotInterval: number;
  rowHeight: number;
  onClick: () => void;
  categoryColors: Record<string, { bg: string; text: string; abbr: string }>;
  isAssisting?: boolean;
  hasAssistants?: boolean;
  colorBy?: 'status' | 'service' | 'stylist';
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  assistantProfilesMap?: Map<string, AssistantProfile[]>;
  columnIndex?: number;
  totalOverlapping?: number;
}) {
  const [isHoveredRight, setIsHoveredRight] = useState(false);
  const hoverBoundsRef = useRef<DOMRect | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isHoveredRight) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX > rect.right - 24) {
      hoverBoundsRef.current = rect;
      setIsHoveredRight(true);
    }
  };

  useEffect(() => {
    if (!isHoveredRight) {
      hoverBoundsRef.current = null;
      return;
    }

    const handleWindowMouseMove = (event: MouseEvent) => {
      const bounds = hoverBoundsRef.current;
      if (!bounds) return;

      const isWithinOriginalCardBounds =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

      if (!isWithinOriginalCardBounds) {
        setIsHoveredRight(false);
      }
    };

    const handleWindowBlur = () => setIsHoveredRight(false);

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isHoveredRight]);

  const style = getEventStyle(appointment.start_time, appointment.end_time, hoursStart, rowHeight, slotInterval);
  const pixelHeight = parseInt(style.height);
  const size = getCardSize(appointment.start_time, appointment.end_time, undefined, pixelHeight);

  // Overlap layout
  const widthPercent = 100 / totalOverlapping;
  const leftPercent = columnIndex * widthPercent;
  const isFirstCol = columnIndex === 0;
  const isLastCol = columnIndex === totalOverlapping - 1;
  const leftOffset = isFirstCol ? 1 : 0;
  const rightPad = isLastCol ? 1 : 0;
  const cardWidth = (isHoveredRight && totalOverlapping <= 1)
    ? `calc(${widthPercent * 0.7}%)`
    : `calc(${widthPercent}% - ${leftOffset + rightPad}px)`;

  return (
    <div
      className="absolute z-10"
      style={{
        top: style.top,
        height: style.height,
        left: `calc(${leftPercent}% + ${leftOffset}px)`,
        width: cardWidth,
        transition: 'width 200ms ease-out',
      }}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <AppointmentCardContent
        appointment={appointment}
        variant="grid"
        size={size}
        pixelHeight={pixelHeight}
        isAssisting={isAssisting}
        hasAssistants={hasAssistants}
        colorBy={colorBy}
        serviceLookup={serviceLookup}
        assistantNamesMap={assistantNamesMap}
        assistantProfilesMap={assistantProfilesMap}
        categoryColors={categoryColors}
        
        showStylistBadge
        showClientPhone={false}
        showClientAvatar={false}
        useShortLabels
        onClick={() => {}}
      />
      {/* Right-edge grip indicator */}
      <div className={cn(
        'absolute right-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center gap-0.5 transition-opacity duration-200',
        isHoveredRight ? 'opacity-60' : 'opacity-0',
      )}>
        <div className="w-0.5 h-1.5 rounded-full bg-foreground/50" />
        <div className="w-0.5 h-1.5 rounded-full bg-foreground/50" />
        <div className="w-0.5 h-1.5 rounded-full bg-foreground/50" />
      </div>
    </div>
  );
}

export function WeekView({
  currentDate,
  appointments,
  hoursStart = 8,
  hoursEnd = 20,
  zoomLevel = 0,
  onAppointmentClick,
  onSlotClick,
  selectedLocationId,
  onDayDoubleClick,
  locationHoursJson,
  locationHolidayClosures,
  assistedAppointmentIds,
  appointmentsWithAssistants,
  colorBy = 'service',
  serviceLookup,
  assistantNamesMap,
  assistantProfilesMap,
  assistantTimeBlocks = [],
}: WeekViewProps) {
  const { colorMap: categoryColors } = useServiceCategoryColorsMap();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure container height for dynamic row sizing
  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  // Derive slot interval from zoom level
  const slotInterval = ZOOM_CONFIG[String(zoomLevel)]?.interval ?? 20;
  const totalSlots = (hoursEnd - hoursStart) * (60 / slotInterval);
  const availableHeight = containerHeight - 56;
  const ROW_HEIGHT = containerHeight > 0
    ? Math.max(MIN_ROW_HEIGHT, Math.floor(availableHeight / totalSlots))
    : MIN_ROW_HEIGHT;

  // Auto-scroll to 1 hour before earliest opening time across the week
  useEffect(() => {
    if (!scrollRef.current) return;
    let earliestOpen = hoursStart;
    if (locationHoursJson) {
      const openHours = weekDays.map(day => {
        const info = getLocationHoursForDate(locationHoursJson, locationHolidayClosures ?? null, day);
        if (info.isClosed || !info.openTime) return Infinity;
        const [h] = info.openTime.split(':').map(Number);
        return h;
      }).filter(h => h !== Infinity);
      if (openHours.length > 0) {
        earliestOpen = Math.min(...openHours);
      }
    }
    const scrollToHour = Math.max(earliestOpen - 1, hoursStart);
    const slotsOffset = (scrollToHour - hoursStart) * (60 / slotInterval);
    const top = slotsOffset * ROW_HEIGHT;
    const ref = scrollRef.current;
    requestAnimationFrame(() => {
      ref?.scrollTo({ top, behavior: 'instant' });
    });
  }, [currentDate.toDateString(), locationHoursJson, hoursStart, slotInterval, ROW_HEIGHT]);
  
  // Week starts with currentDate, followed by 6 future days
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentDate, i)),
    [currentDate.toDateString()]
  );
  
  // Generate time slots based on zoom interval
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string; isHour: boolean; isHalf: boolean }[] = [];
    for (let hour = hoursStart; hour < hoursEnd; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const isHour = minute === 0;
        const isHalf = minute === 30;
        let label = '';
        if (isHour) {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          label = `${hour12} ${ampm}`;
        } else if (isHalf && slotInterval <= 30) {
          label = '30';
        }
        slots.push({ hour, minute, label, isHour, isHalf });
      }
    }
    return slots;
  }, [hoursStart, hoursEnd, slotInterval]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, PhorestAppointment[]>();
    weekDays.forEach(day => map.set(format(day, 'yyyy-MM-dd'), []));
    
    appointments.forEach(apt => {
      const dateKey = apt.appointment_date;
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(apt);
      }
    });
    
    return map;
  }, [appointments, weekDays]);

  // Current time indicator
  const { isToday: isOrgToday, isTomorrow: isOrgTomorrow, nowMinutes: wkNowMins } = useOrgNow();
  const todayInWeek = weekDays.find(d => isOrgToday(d));
  const showCurrentTime = !!todayInWeek;
  const currentTimeOffset = showCurrentTime
    ? (wkNowMins - (hoursStart * 60)) / slotInterval * ROW_HEIGHT
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border border-border rounded-lg bg-card">
        <div>
          {/* Day Headers with luxury blur effect */}
          <div className="sticky top-0 z-20">
            {/* Main header with frosted glass effect */}
            <div 
              className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-border/50"
              style={{
                background: 'hsl(var(--muted) / 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="p-2" /> {/* Time column spacer */}
              {weekDays.map((day) => {
                const dayIsToday = isOrgToday(day);
                const dayIsTomorrow = isOrgTomorrow(day);
                
                const dateKey = format(day, 'yyyy-MM-dd');
                const apptCount = appointmentsByDate.get(dateKey)?.length || 0;
                const dayHoursInfo = getLocationHoursForDate(locationHoursJson ?? null, locationHolidayClosures ?? null, day);
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      'py-3 px-2 text-center border-l border-border/50 cursor-pointer select-none',
                      dayIsToday && 'bg-primary/10',
                      dayHoursInfo.isClosed && 'bg-muted/40'
                    )}
                    onDoubleClick={() => onDayDoubleClick?.(day)}
                  >
                    <div className={cn(
                      'text-[10px] font-display uppercase tracking-wider font-medium',
                      dayIsToday ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {format(day, 'EEE')}{dayIsToday ? ' · Today' : dayIsTomorrow ? ' · Tomorrow' : ''}
                    </div>
                    <div className="flex items-center justify-center mt-1">
                      <span className={cn(
                        'text-xl font-medium flex items-center justify-center transition-colors',
                        dayIsToday 
                          ? 'bg-foreground text-background min-w-[36px] h-9 px-2 rounded-full' 
                          : 'text-foreground'
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className={cn(
                      'text-[10px] mt-1',
                      dayIsToday ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}>
                      {dayHoursInfo.isClosed ? (
                        <ClosedBadge reason={dayHoursInfo.closureReason} />
                      ) : dayIsToday ? 'Today' : `${apptCount} appts`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] relative">
            {/* Time Labels Column */}
            <div className="relative bg-sidebar">
              {timeSlots.map((slot, index) => (
                <div 
                  key={`${slot.hour}-${slot.minute}`}
                  className={cn(
                    'text-xs text-muted-foreground pr-2 text-right flex items-center justify-end',
                    slot.isHour && 'font-medium'
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {slot.label && (
                    <span className={cn(
                      slot.isHour ? 'text-foreground' : 'text-muted-foreground/60'
                    )}>
                      {slot.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDate.get(dateKey) || [];
              const isCurrentDay = isOrgToday(day);
              const dayHoursInfo = getLocationHoursForDate(locationHoursJson ?? null, locationHolidayClosures ?? null, day);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    'relative border-l border-border',
                    isCurrentDay && 'bg-primary/5',
                    dayHoursInfo.isClosed && 'bg-muted/20'
                  )}
                >
                  {/* Time slot rows */}
                  {timeSlots.map((slot) => {
                    const slotTime = `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
                    
                    // Check if this slot is in the past (only for today)
                    const isPastSlot = isCurrentDay && (() => {
                      const slotMins = slot.hour * 60 + slot.minute;
                      return slotMins < wkNowMins;
                    })();

                    // Check if slot is outside operating hours
                    const isOutsideHours = dayHoursInfo.isClosed || (
                      dayHoursInfo.openTime && dayHoursInfo.closeTime &&
                      (slotTime < dayHoursInfo.openTime || slotTime >= dayHoursInfo.closeTime)
                    );

                    return (
                      <WeekSlot
                        key={slotTime}
                        hour={slot.hour}
                        minute={slot.minute}
                        isHour={slot.isHour}
                        isHalf={slot.isHalf}
                        isPastSlot={!!isPastSlot}
                        isOutsideHours={!!isOutsideHours}
                        rowHeight={ROW_HEIGHT}
                        slotInterval={slotInterval}
                        onClick={() => onSlotClick?.(day, slotTime)}
                      />
                    );
                  })}
                  
                  {/* Assistant time block overlays */}
                  {assistantTimeBlocks
                    .filter(b => b.date === dateKey)
                    .map(block => {
                      const blockStyle = getEventStyle(block.start_time, block.end_time, hoursStart, slotInterval, ROW_HEIGHT);
                      const isUnassigned = !block.assistant_user_id;
                      const isConfirmed = block.status === 'confirmed';
                      return (
                        <Tooltip key={block.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'absolute left-0 w-1.5 z-[4] rounded-r-sm',
                                isUnassigned && 'bg-amber-400/60 border-r border-dashed border-amber-500/40',
                                isConfirmed && 'bg-primary/30',
                                !isUnassigned && !isConfirmed && 'bg-primary/20',
                              )}
                              style={blockStyle}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs max-w-xs z-[100]">
                            <div className="space-y-0.5">
                              <div className="font-medium flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Assistant Coverage
                              </div>
                              <div className="text-muted-foreground">
                                {formatTime12h(block.start_time)} – {formatTime12h(block.end_time)}
                              </div>
                              {isUnassigned && <div className="text-amber-600 dark:text-amber-400">Unassigned</div>}
                              {block.assistant_profile && (
                                <div className="text-primary">
                                  {formatDisplayName(block.assistant_profile.full_name, block.assistant_profile.display_name)}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                  {/* Appointments */}
                  {dayAppointments.map((apt) => {
                    const { columnIndex, totalOverlapping } = getOverlapInfo(dayAppointments, apt);
                    return (
                      <WeekAppointmentCard
                        key={apt.id}
                        appointment={apt}
                        hoursStart={hoursStart}
                        slotInterval={slotInterval}
                        rowHeight={ROW_HEIGHT}
                        onClick={() => onAppointmentClick(apt)}
                        categoryColors={categoryColors}
                        isAssisting={assistedAppointmentIds?.has(apt.id) || false}
                        hasAssistants={appointmentsWithAssistants?.has(apt.id) || false}
                        colorBy={colorBy}
                        serviceLookup={serviceLookup}
                        assistantNamesMap={assistantNamesMap}
                        assistantProfilesMap={assistantProfilesMap}
                        columnIndex={columnIndex}
                        totalOverlapping={totalOverlapping}
                      />
                    );
                  })}

                  {/* Current time indicator */}
                  {isCurrentDay && currentTimeOffset > 0 && currentTimeOffset < timeSlots.length * ROW_HEIGHT && (
                    <div 
                      className="absolute left-0 right-0 pointer-events-none z-30"
                      style={{ top: `${currentTimeOffset}px` }}
                    >
                      <div className="relative">
                        <div className="absolute left-0 right-0 border-t-2 border-blue-500" />
                        <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-blue-500 rounded-full shadow" />
                        <div className="absolute left-3 -top-2.5 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow">
                          {(() => {
                            const h = Math.floor(wkNowMins / 60);
                            const m = wkNowMins % 60;
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
