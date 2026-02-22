import { useMemo, useState, useRef, useEffect } from 'react';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { isClosedOnDate, getLocationHoursForDate, type HoursJson, type HolidayClosure } from '@/hooks/useLocations';
import { 
  format, 
  addDays, 
  isToday,
  isTomorrow,
} from 'date-fns';
import { cn, formatPhoneDisplay, formatDisplayName } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Phone, User, Users, Repeat, RotateCcw, Star, ArrowRightLeft, Clock } from 'lucide-react';
import { getClientInitials, getAvatarColor, formatServicesWithDuration, sortServices } from '@/lib/appointment-card-utils';
import { StylistBadge } from './StylistBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatRelativeTime } from '@/lib/format';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { QuickBookingPopover } from './QuickBookingPopover';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { getCategoryColor, SPECIAL_GRADIENTS, isGradientMarker, getGradientFromMarker, getDarkCategoryStyle } from '@/utils/categoryColors';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/design-tokens';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';

interface WeekViewProps {
  currentDate: Date;
  appointments: PhorestAppointment[];
  hoursStart?: number;
  hoursEnd?: number;
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
  assistantTimeBlocks?: AssistantTimeBlock[];
}

// Use consolidated status colors from design tokens
const STATUS_COLORS = APPOINTMENT_STATUS_COLORS;

const ROW_HEIGHT = 20; // Height per 15-minute slot
const SLOTS_PER_HOUR = 4;

// Categories that display the X pattern overlay
const BLOCKED_CATEGORIES = ['Block', 'Break'];

// Helper to detect consultation category
const isConsultationCategory = (category: string | null | undefined) => {
  if (!category) return false;
  return category.toLowerCase().includes('consult');
};

// Default consultation gradient (teal-lime) for fallback
const DEFAULT_CONSULTATION_GRADIENT = SPECIAL_GRADIENTS['teal-lime'];

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getEventStyle(startTime: string, endTime: string, hoursStart: number) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const startOffset = startMinutes - (hoursStart * 60);
  const duration = endMinutes - startMinutes;
  const top = (startOffset / 15) * ROW_HEIGHT;
  const height = Math.max((duration / 15) * ROW_HEIGHT, ROW_HEIGHT);
  return { top: `${top}px`, height: `${height}px` };
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function AppointmentCard({ 
  appointment, 
  hoursStart,
  onClick,
  categoryColors,
  isAssisting = false,
  hasAssistants = false,
  colorBy = 'service',
  serviceLookup,
  assistantNamesMap,
}: {
  appointment: PhorestAppointment; 
  hoursStart: number;
  onClick: () => void;
  categoryColors: Record<string, { bg: string; text: string; abbr: string }>;
  isAssisting?: boolean;
  hasAssistants?: boolean;
  colorBy?: 'status' | 'service' | 'stylist';
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
}) {
  const style = getEventStyle(appointment.start_time, appointment.end_time, hoursStart);
  const statusColors = STATUS_COLORS[appointment.status];
  const duration = parseTimeToMinutes(appointment.end_time) - parseTimeToMinutes(appointment.start_time);
  const isCompact = duration <= 30;
  const isMedium = duration <= 60;

  // Get category-based color for non-status-specific appointments
  const serviceCategory = appointment.service_category;
  const catColor = getCategoryColor(serviceCategory, categoryColors);
  const useCategoryColor = colorBy === 'service' || appointment.status === 'booked';
  const isConsultation = isConsultationCategory(serviceCategory);
  
  // Check if the category has a gradient marker stored
  const storedColorHex = categoryColors[serviceCategory?.toLowerCase() || '']?.bg || '';
  const gradientFromMarker = isGradientMarker(storedColorHex) ? getGradientFromMarker(storedColorHex) : null;
  
  // Use gradient if: marker stored, OR consultation category defaults to teal-lime
  const displayGradient = gradientFromMarker || (isConsultation ? DEFAULT_CONSULTATION_GRADIENT : null);

  // Multi-service color banding
  const serviceBands = useMemo(() => {
    if (!useCategoryColor || !serviceLookup || displayGradient || isCompact) return null;
    const sorted = sortServices(appointment.service_name, serviceLookup);
    if (sorted.length <= 1) return null;
    
    const bands = sorted.map(s => {
      const category = s.category || appointment.service_category;
      const color = getCategoryColor(category, categoryColors);
      return { name: s.name, category, duration: s.duration || 30, color, isExtra: s.isExtra };
    });
    
    const totalDuration = bands.reduce((sum, b) => sum + b.duration, 0);
    
    return bands.map(b => ({
      ...b,
      percent: (b.duration / totalDuration) * 100,
    }));
  }, [appointment.service_name, appointment.service_category, serviceLookup, categoryColors, useCategoryColor, displayGradient, isCompact]);

  // Dark mode detection and solid dark style
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const darkStyle = useMemo(() => {
    if (!isDark || !useCategoryColor || displayGradient) return null;
    return getDarkCategoryStyle(catColor.bg);
  }, [isDark, useCategoryColor, displayGradient, catColor.bg]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute left-1 right-1 z-10 rounded-md px-2 py-1 cursor-pointer transition-all hover:shadow-lg hover:z-20 overflow-hidden',
            !displayGradient && 'border-l-4',
            !useCategoryColor && !displayGradient && statusColors.bg,
            !useCategoryColor && !displayGradient && statusColors.border,
            !useCategoryColor && !displayGradient && statusColors.text,
            appointment.status === 'cancelled' && 'opacity-50 line-through',
            displayGradient && 'shadow-lg',
            // Pending redo: amber dashed border treatment
            appointment.status === 'pending' && (appointment as any).is_redo && 'border-dashed border-2 border-amber-500 dark:border-amber-400',
          )}
          style={{
            ...style,
          ...(displayGradient ? {
            background: displayGradient.background,
            color: displayGradient.textColor,
          } : useCategoryColor && darkStyle ? {
            backgroundColor: darkStyle.fill,
            color: darkStyle.text,
            borderColor: darkStyle.stroke,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderLeftColor: darkStyle.accent,
            borderLeftWidth: '4px',
            boxShadow: !isCompact ? darkStyle.glow : undefined,
            transition: 'background-color 150ms ease, box-shadow 150ms ease',
          } : useCategoryColor ? {
              backgroundColor: catColor.bg,
              color: catColor.text,
              borderLeftColor: catColor.bg,
            } : undefined),
          }}
          onClick={onClick}
        >
          {/* Glass stroke overlay for gradient */}
          {displayGradient && (
            <div 
              className="absolute inset-0 rounded-sm pointer-events-none"
              style={{
                background: displayGradient.glassStroke,
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'xor',
                WebkitMaskComposite: 'xor',
                padding: '1px',
              }}
            />
          )}
          {/* Shimmer animation for gradient */}
          {displayGradient && (
            <div 
              className="absolute inset-0 pointer-events-none animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          )}
          {/* X pattern overlay for Block/Break entries */}
          {BLOCKED_CATEGORIES.includes(appointment.service_category || '') && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div 
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom right, 
                    transparent calc(50% - 1px), 
                    ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% - 1px), 
                    ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% + 1px), 
                    transparent calc(50% + 1px))`,
                }}
              />
              <div 
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom left, 
                    transparent calc(50% - 1px), 
                    ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% - 1px), 
                    ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% + 1px), 
                    transparent calc(50% + 1px))`,
                }}
              />
            </div>
          )}
          {/* Multi-service color bands */}
          {serviceBands && useCategoryColor && (
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-md">
              {serviceBands.map((band, i) => {
                const bandDark = isDark ? getDarkCategoryStyle(band.color.bg) : null;
                return (
                  <div
                    key={i}
                    style={{
                      flex: `${band.percent} 0 0%`,
                      backgroundColor: bandDark ? bandDark.fill : band.color.bg,
                    }}
                  />
                );
              })}
            </div>
          )}
          {/* Stylist badge top-right */}
          {!isCompact && appointment.stylist_profile && (
            <div className="absolute top-0.5 right-0.5 z-10">
              <StylistBadge
                stylistProfile={appointment.stylist_profile}
                assistantNames={assistantNamesMap?.get(appointment.id)}
              />
            </div>
          )}
          <div className="relative z-10" style={serviceBands ? { textShadow: '0 0 3px rgba(0,0,0,0.15)' } : undefined}>
            {isCompact ? (
              <div className="text-xs font-medium truncate flex items-center gap-0.5">
                {(appointment as any).is_redo && <RotateCcw className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                {appointment.recurrence_group_id && <Repeat className="h-2.5 w-2.5 opacity-60 shrink-0" />}
                {(appointment as any).rescheduled_at && <ArrowRightLeft className="h-2.5 w-2.5 text-blue-500 dark:text-blue-400 shrink-0" />}
                {isAssisting && <span className="bg-accent/80 text-accent-foreground text-[7px] px-0.5 rounded-sm font-medium shrink-0">AST</span>}
                {!isAssisting && hasAssistants && <Users className="h-2.5 w-2.5 opacity-60 shrink-0" />}
                {appointment.is_new_client && <Star className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                {appointment.client_name}
              </div>
            ) : isMedium ? (
              <>
                <div className="text-xs font-medium truncate flex items-center gap-0.5">
                  {appointment.recurrence_group_id && <Repeat className="h-3 w-3 opacity-60 shrink-0" />}
                  {(appointment as any).rescheduled_at && <ArrowRightLeft className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />}
                  {isAssisting && <span className="bg-accent/80 text-accent-foreground text-[8px] px-1 py-px rounded-sm font-medium shrink-0">ASSISTING</span>}
                  {!isAssisting && hasAssistants && <Users className="h-3 w-3 opacity-60 shrink-0" />}
                  <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-medium shrink-0', getAvatarColor(appointment.client_name))}>
                    {getClientInitials(appointment.client_name)}
                  </span>
                  {appointment.client_name}
                  {appointment.is_new_client && <span className="text-[8px] px-1 py-px rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium shrink-0">NEW</span>}
                  {appointment.client_phone ? <span className="font-normal opacity-80">{formatPhoneDisplay(appointment.client_phone)}</span> : ''}
                </div>
                <div className="text-[11px] opacity-90 truncate">{formatServicesWithDuration(appointment.service_name, serviceLookup) || appointment.service_name}</div>
              </>
            ) : (
              <>
                <div className="text-xs font-medium truncate flex items-center gap-0.5">
                  {appointment.recurrence_group_id && <Repeat className="h-3 w-3 opacity-60 shrink-0" />}
                  {(appointment as any).rescheduled_at && <ArrowRightLeft className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />}
                  {isAssisting && <span className="bg-accent/80 text-accent-foreground text-[8px] px-1 py-px rounded-sm font-medium shrink-0">ASSISTING</span>}
                  {!isAssisting && hasAssistants && <Users className="h-3 w-3 opacity-60 shrink-0" />}
                  <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-medium shrink-0', getAvatarColor(appointment.client_name))}>
                    {getClientInitials(appointment.client_name)}
                  </span>
                  {appointment.client_name}
                  {appointment.is_new_client && <span className="text-[8px] px-1 py-px rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium shrink-0">NEW</span>}
                  {appointment.client_phone && <span className="font-normal opacity-80">{formatPhoneDisplay(appointment.client_phone)}</span>}
                </div>
                <div className="text-[11px] opacity-90 truncate">{formatServicesWithDuration(appointment.service_name, serviceLookup) || appointment.service_name}</div>
                {(appointment as any).rescheduled_at && (appointment as any).rescheduled_from_time && (
                  <div className="text-[10px] opacity-70 italic truncate flex items-center gap-0.5">
                    <ArrowRightLeft className="h-2.5 w-2.5 shrink-0" />
                    Moved from {formatTime12h((appointment as any).rescheduled_from_time)}
                  </div>
                )}
                <div className="text-[10px] opacity-80 flex items-center justify-between">
                  <span>{formatTime12h(appointment.start_time)} - {formatTime12h(appointment.end_time)}</span>
                  {appointment.total_price != null && appointment.total_price > 0 && (
                    <BlurredAmount className="opacity-70">
                      ${appointment.total_price.toFixed(0)}
                    </BlurredAmount>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Status pip for confirmed/checked_in */}
          {!isCompact && (appointment.status === 'confirmed' || appointment.status === 'checked_in') && (
            <div className="absolute bottom-1 right-1">
              <span className={cn(
                'w-2 h-2 rounded-full block ring-1 ring-white/50',
                appointment.status === 'confirmed' ? 'bg-green-400' : 'bg-blue-400'
              )} />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="font-medium flex items-center gap-1.5">
            {appointment.client_name}
            {appointment.is_new_client && <span className="text-[9px] px-1 py-px rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">NEW</span>}
          </div>
          {appointment.client_phone && (
            <div className="text-sm flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
               <a href={`tel:${appointment.client_phone}`} className="hover:underline">
                {formatPhoneDisplay(appointment.client_phone)}
              </a>
            </div>
          )}
          <div className="text-sm">{formatServicesWithDuration(appointment.service_name, serviceLookup) || appointment.service_name}</div>
          <div className="text-sm text-muted-foreground">
            {formatTime12h(appointment.start_time)} - {formatTime12h(appointment.end_time)}
          </div>
          {appointment.stylist_profile && (
            <div className="text-sm flex items-center gap-1">
              <User className="h-3 w-3" />
              {formatDisplayName(appointment.stylist_profile.full_name, appointment.stylist_profile.display_name)}
            </div>
          )}
          {hasAssistants && assistantNamesMap?.get(appointment.id) && (
            <div className="text-sm flex items-center gap-1">
              <Users className="h-3 w-3" />
              w/ {assistantNamesMap.get(appointment.id)!.join(', ')}
            </div>
          )}
          {appointment.total_price != null && appointment.total_price > 0 && (
            <div className="text-sm text-muted-foreground">
              <BlurredAmount className="font-medium">${appointment.total_price.toFixed(0)}</BlurredAmount>
            </div>
          )}
          {(appointment as any).rescheduled_at && (
            <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" />
              Moved from {(appointment as any).rescheduled_from_date !== appointment.appointment_date ? `${(appointment as any).rescheduled_from_date} ` : ''}{formatTime12h((appointment as any).rescheduled_from_time)} · {formatRelativeTime((appointment as any).rescheduled_at)}
            </div>
          )}
          <Badge variant="outline" className={cn('text-xs', statusColors.bg, statusColors.text)}>
            {appointment.status.replace('_', ' ')}
          </Badge>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function WeekView({
  currentDate,
  appointments,
  hoursStart = 8,
  hoursEnd = 20,
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
  assistantTimeBlocks = [],
}: WeekViewProps) {
  const [activeSlot, setActiveSlot] = useState<{ date: Date; time: string } | null>(null);
  const { colorMap: categoryColors } = useServiceCategoryColorsMap();
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const slotsOffset = (scrollToHour - hoursStart) * SLOTS_PER_HOUR;
    const top = slotsOffset * ROW_HEIGHT;
    const ref = scrollRef.current;
    requestAnimationFrame(() => {
      ref?.scrollTo({ top, behavior: 'instant' });
    });
  }, [currentDate.toDateString(), locationHoursJson, hoursStart]);
  
  // Week starts with today, followed by 6 future days
  const today = new Date();
  
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(today, i)),
    [today.toDateString()]
  );
  
  // Generate all 15-minute time slots
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string; isHour: boolean; isHalf: boolean }[] = [];
    for (let hour = hoursStart; hour < hoursEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const isHour = minute === 0;
        const isHalf = minute === 30;
        let label = '';
        if (isHour) {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          label = `${hour12} ${ampm}`;
        } else if (isHalf) {
          label = '30';
        }
        slots.push({ hour, minute, label, isHour, isHalf });
      }
    }
    return slots;
  }, [hoursStart, hoursEnd]);

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
  const now = new Date();
  const todayInWeek = weekDays.find(d => isToday(d));
  const showCurrentTime = !!todayInWeek;
  const currentTimeOffset = showCurrentTime
    ? ((now.getHours() * 60 + now.getMinutes()) - (hoursStart * 60)) / 15 * ROW_HEIGHT
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-auto border border-border rounded-lg bg-card">
        <div className="min-w-[800px]">
          {/* Day Headers with luxury blur effect */}
          <div className="sticky top-0 z-10">
            {/* Main header with frosted glass effect */}
            <div 
              className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-border/50"
              style={{
                background: 'hsl(var(--muted) / 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="p-2" /> {/* Time column spacer */}
              {weekDays.map((day) => {
                const dayIsToday = isToday(day);
                const dayIsTomorrow = isTomorrow(day);
                
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
                      'text-[10px] uppercase tracking-wider font-medium',
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
            {/* Bottom blur fade for smooth transition */}
            <div 
              className="h-4 w-full pointer-events-none -mt-px"
              style={{
                background: 'linear-gradient(to bottom, hsl(var(--muted) / 0.5), transparent)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
              }}
            />
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] relative">
            {/* Time Labels Column */}
            <div className="relative bg-sidebar">
              {timeSlots.map((slot, index) => (
                <div 
                  key={`${slot.hour}-${slot.minute}`}
                  className={cn(
                    'h-[20px] text-xs text-muted-foreground pr-2 text-right flex items-center justify-end',
                    slot.isHour && 'font-medium'
                  )}
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
              const isCurrentDay = isToday(day);
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
                    const isActive = activeSlot?.date.getTime() === day.getTime() && activeSlot?.time === slotTime;
                    
                    // Check if this slot is in the past (only for today)
                    const isPastSlot = isCurrentDay && (() => {
                      const slotDate = new Date(day);
                      slotDate.setHours(slot.hour, slot.minute, 0, 0);
                      return slotDate < now;
                    })();

                    // Check if slot is outside operating hours
                    const isOutsideHours = dayHoursInfo.isClosed || (
                      dayHoursInfo.openTime && dayHoursInfo.closeTime &&
                      (slotTime < dayHoursInfo.openTime || slotTime >= dayHoursInfo.closeTime)
                    );
                    
                    // Determine if this is a "special" slot that should route through onSlotClick
                    const isSpecialSlot = isPastSlot || dayHoursInfo.isClosed || isOutsideHours;

                    // Special slots (past, closed, outside hours) route through onSlotClick for warnings
                    if (isSpecialSlot) {
                      return (
                        <div 
                          key={slotTime}
                          className={cn(
                            'h-[20px] cursor-pointer transition-colors group relative',
                            isPastSlot && 'bg-muted/40',
                            slot.isHour 
                              ? 'border-t border-border/80 dark:border-border/50' 
                              : slot.isHalf 
                                ? 'border-t border-dotted border-border/60 dark:border-border/30'
                                : 'border-t border-dotted border-border/40 dark:border-border/15'
                          )}
                          style={!isPastSlot && isOutsideHours ? {
                            background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.08) 4px, hsl(var(--muted-foreground) / 0.08) 5px)`,
                          } : undefined}
                          onClick={() => onSlotClick?.(day, slotTime)}
                        >
                          {isPastSlot && (
                            <div className="absolute left-1/2 -translate-x-1/2 -top-7 bg-muted-foreground text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 whitespace-nowrap">
                              This time slot is no longer available
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <QuickBookingPopover
                        key={slotTime}
                        date={day}
                        time={slotTime}
                        open={isActive}
                        onOpenChange={(open) => {
                          if (open) {
                            setActiveSlot({ date: day, time: slotTime });
                          } else {
                            setActiveSlot(null);
                          }
                        }}
                        defaultLocationId={selectedLocationId}
                      >
                        <div 
                          className={cn(
                            'h-[20px] hover:bg-primary/10 cursor-pointer transition-colors group relative',
                            slot.isHour 
                              ? 'border-t border-border/80 dark:border-border/50' 
                              : slot.isHalf 
                                ? 'border-t border-dotted border-border/60 dark:border-border/30'
                                : 'border-t border-dotted border-border/40 dark:border-border/15'
                          )}
                          onMouseMove={(e) => {
                            const target = e.currentTarget;
                            const rect = target.getBoundingClientRect();
                            target.dataset.mouseX = String(e.clientX - rect.left);
                            const badge = target.querySelector('[data-slot-badge]') as HTMLElement;
                            if (badge) badge.style.left = `${e.clientX - rect.left}px`;
                          }}
                        >
                          <div data-slot-badge className="absolute -translate-x-1/2 -top-8 bg-foreground text-background text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 whitespace-nowrap font-display font-medium tracking-wide" style={{ left: '50%' }}>
                            {(() => {
                              const ampm = slot.hour >= 12 ? 'PM' : 'AM';
                              const hour12 = slot.hour % 12 || 12;
                              return `${hour12}:${slot.minute.toString().padStart(2, '0')} ${ampm}`;
                            })()}
                          </div>
                        </div>
                      </QuickBookingPopover>
                    );
                  })}
                  
                  {/* Assistant time block overlays */}
                  {assistantTimeBlocks
                    .filter(b => b.date === dateKey)
                    .map(block => {
                      const blockStyle = getEventStyle(block.start_time, block.end_time, hoursStart);
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
                                  {block.assistant_profile.display_name || block.assistant_profile.full_name}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                  {/* Appointments */}
                  {dayAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      hoursStart={hoursStart}
                      onClick={() => onAppointmentClick(apt)}
                      categoryColors={categoryColors}
                      isAssisting={assistedAppointmentIds?.has(apt.id) || false}
                      hasAssistants={appointmentsWithAssistants?.has(apt.id) || false}
                      colorBy={colorBy}
                      serviceLookup={serviceLookup}
                      assistantNamesMap={assistantNamesMap}
                    />
                  ))}

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
                          {format(now, 'h:mm a')}
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
