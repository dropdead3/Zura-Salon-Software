import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import type { AssistantProfile } from '@/hooks/useAppointmentAssistantNames';
import { format, getWeek } from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { cn, formatPhoneDisplay, formatDisplayName } from '@/lib/utils';
import type { AdminMeeting } from '@/hooks/useAdminMeetings';
import { MeetingGridCard } from './meetings/MeetingCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { useRescheduleAppointment } from '@/hooks/useRescheduleAppointment';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/design-tokens';
import { StylistBadge } from './StylistBadge';
import { AssistantBlockOverlay } from './AssistantBlockOverlay';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';
import { AppointmentCardContent, getCardSize } from './AppointmentCardContent';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';

interface DayViewProps {
  date: Date;
  appointments: PhorestAppointment[];
  stylists: Array<{
    user_id: string;
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  }>;
  hoursStart?: number;
  hoursEnd?: number;
  onAppointmentClick: (appointment: PhorestAppointment) => void;
  onSlotClick?: (stylistId: string, time: string) => void;
  
  selectedAppointmentId?: string | null;
  locationHours?: { open: string; close: string } | null;
  isLocationClosed?: boolean;
  closureReason?: string;
  assistedAppointmentIds?: Set<string>;
  appointmentsWithAssistants?: Set<string>;
  colorBy?: 'status' | 'service' | 'stylist';
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  assistantProfilesMap?: Map<string, AssistantProfile[]>;
  assistantTimeBlocks?: AssistantTimeBlock[];
  onBlockClick?: (block: AssistantTimeBlock) => void;
  onBlockResize?: (blockId: string, newEndTime: string) => void;
  currentUserId?: string;
  adminMeetings?: (AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] })[];
  onMeetingClick?: (meeting: AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] }) => void;
}

// Use consolidated status colors from design tokens
const STATUS_COLORS = APPOINTMENT_STATUS_COLORS;

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getEventStyle(startTime: string, endTime: string, hoursStart: number, rowHeight: number = 20) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const startOffset = startMinutes - (hoursStart * 60);
  const duration = endMinutes - startMinutes;
  const top = (startOffset / 15) * rowHeight;
  const height = Math.max((duration / 15) * rowHeight, rowHeight);
  return { top: `${top}px`, height: `${height}px` };
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Categories that display the X pattern overlay
const BLOCKED_CATEGORIES = ['Block', 'Break'];

// ─── Droppable Time Slot ───────────────────────────────────────────
function formatSlotTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

function DroppableSlot({
  id,
  hour,
  minute,
  isAvailable,
  isPastSlot,
  isOutsideHours,
  showCurrentTime,
  onClick,
  
  isOver,
}: {
  id: string;
  hour: number;
  minute: number;
  isAvailable: boolean;
  isPastSlot: boolean;
  isOutsideHours: boolean;
  showCurrentTime: boolean;
  onClick: () => void;
  
  isOver: boolean;
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id });
  const highlight = isOver || dndIsOver;
  const [mouseX, setMouseX] = useState<number | null>(null);

  const borderClass = minute === 0
    ? 'border-t border-border dark:border-border/50'
    : minute === 30
      ? 'border-t border-dashed border-border dark:border-border/35'
      : 'border-t border-dotted border-border/80 dark:border-border/15';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-5 group relative',
        borderClass,
        isPastSlot
          ? 'bg-muted/40 cursor-not-allowed'
          : isOutsideHours
            ? 'cursor-pointer'
            : isAvailable
              ? 'bg-background hover:bg-muted/30 cursor-pointer'
              : 'bg-muted/50',
        highlight && isAvailable && 'bg-primary/20 ring-1 ring-primary/40'
      )}
      style={isOutsideHours && !isPastSlot ? {
        background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.08) 4px, hsl(var(--muted-foreground) / 0.08) 5px)`,
      } : undefined}
      onClick={() => {
        if (isPastSlot || isAvailable || isOutsideHours) onClick();
      }}
      onMouseMove={(e) => setMouseX(e.nativeEvent.offsetX)}
    >
      {isPastSlot && (
        <div className="absolute -translate-x-1/2 -top-8 bg-muted-foreground text-white text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 whitespace-nowrap font-display font-medium tracking-wide" style={{ left: mouseX ?? '50%' }}>
          This time slot is no longer available
        </div>
      )}
      {(isAvailable || isOutsideHours) && !isPastSlot && (
        <div className="absolute -translate-x-1/2 -top-8 bg-foreground text-background text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 whitespace-nowrap font-display font-medium tracking-wide" style={{ left: mouseX ?? '50%' }}>
          {formatSlotTime(hour, minute)}
        </div>
      )}
    </div>
  );
}

// ─── Draggable Appointment Card (thin wrapper) ─────────────────
interface AppointmentCardProps {
  appointment: PhorestAppointment;
  hoursStart: number;
  onClick: () => void;
  isSelected?: boolean;
  columnIndex?: number;
  totalOverlapping?: number;
  categoryColors: Record<string, { bg: string; text: string; abbr: string }>;
  isDragOverlay?: boolean;
  isAssisting?: boolean;
  hasAssistants?: boolean;
  colorBy?: 'status' | 'service' | 'stylist';
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  assistantProfilesMap?: Map<string, AssistantProfile[]>;
  hasCoverageScheduled?: boolean;
  date?: Date;
}

function AppointmentCard({
  appointment,
  hoursStart,
  onClick,
  isSelected = false,
  columnIndex = 0,
  totalOverlapping = 1,
  categoryColors,
  isDragOverlay = false,
  isAssisting = false,
  hasAssistants = false,
  colorBy = 'service',
  serviceLookup,
  assistantNamesMap,
  date,
}: AppointmentCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDragOverlay,
  });

  const style = getEventStyle(appointment.start_time, appointment.end_time, hoursStart);
  const widthPercent = 100 / totalOverlapping;
  const leftPercent = columnIndex * widthPercent;
  const size = getCardSize(appointment.start_time, appointment.end_time);


  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
      className={cn(
        'absolute z-10',
        isDragging && !isDragOverlay && 'opacity-30',
        isDragOverlay && 'shadow-2xl ring-2 ring-primary scale-105 z-50',
      )}
      style={{
        ...(isDragOverlay ? { position: 'relative', width: '200px', height: style.height } : style),
        ...(!isDragOverlay ? {
          left: `calc(${leftPercent}% + 2px)`,
          width: `calc(${widthPercent}% - 4px)`,
        } : {}),
      }}
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
    >
      <AppointmentCardContent
        appointment={appointment}
        variant="grid"
        size={size}
        isSelected={isSelected}
        isAssisting={isAssisting}
        hasAssistants={hasAssistants}
        colorBy={colorBy}
        serviceLookup={serviceLookup}
        assistantNamesMap={assistantNamesMap}
        categoryColors={categoryColors}
        
        onClick={() => {}}
      />
    </div>
  );
}

export function DayView({
  date,
  appointments,
  stylists,
  hoursStart = 7,
  hoursEnd = 21,
  onAppointmentClick,
  onSlotClick,
  
  selectedAppointmentId,
  locationHours,
  isLocationClosed,
  closureReason,
  assistedAppointmentIds,
  appointmentsWithAssistants,
  colorBy = 'service',
  serviceLookup,
  assistantNamesMap,
  assistantProfilesMap,
  assistantTimeBlocks = [],
  onBlockClick,
  onBlockResize,
  currentUserId,
  adminMeetings = [],
  onMeetingClick,
}: DayViewProps) {
  const ROW_HEIGHT = 20; // 20px per 15-min slot (matches Week view)
  const { colorMap: categoryColors } = useServiceCategoryColorsMap();
  const reschedule = useRescheduleAppointment();
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to 1 hour before opening time
  useEffect(() => {
    if (!scrollRef.current) return;
    let openHour = hoursStart;
    if (locationHours?.open) {
      const [h] = locationHours.open.split(':').map(Number);
      openHour = h;
    }
    const scrollToHour = Math.max(openHour - 1, hoursStart);
    const slotsOffset = (scrollToHour - hoursStart) * 4; // 4 slots per hour
    const top = slotsOffset * ROW_HEIGHT;
    const ref = scrollRef.current;
    requestAnimationFrame(() => {
      ref?.scrollTo({ top, behavior: 'instant' });
    });
  }, [date.toDateString(), locationHours?.open, hoursStart]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12} ${ampm}`;
  };

  // Generate time labels for each hour with 15-min intervals
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string; isHour: boolean; isHalf: boolean }[] = [];
    for (let hour = hoursStart; hour < hoursEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const isHour = minute === 0;
        const isHalf = minute === 30;
        const label = isHour ? formatHour(hour) : isHalf ? '30' : '';
        slots.push({ hour, minute, label, isHour, isHalf });
      }
    }
    return slots;
  }, [hoursStart, hoursEnd]);

  const dateStr = format(date, 'yyyy-MM-dd');
  const weekNumber = getWeek(date);
  
  // Group appointments by stylist
  const appointmentsByStylist = useMemo(() => {
    const map = new Map<string, PhorestAppointment[]>();
    stylists.forEach(s => map.set(s.user_id, []));
    
    appointments
      .filter(apt => apt.appointment_date === dateStr)
      .forEach(apt => {
        if (apt.stylist_user_id && map.has(apt.stylist_user_id)) {
          map.get(apt.stylist_user_id)!.push(apt);
        }
      });
    
    return map;
  }, [appointments, stylists, dateStr]);

  // Find active appointment for drag overlay
  const activeAppointment = useMemo(() => {
    if (!activeId) return null;
    return appointments.find(a => a.id === activeId) || null;
  }, [activeId, appointments]);

  // Current time indicator
  const { isToday: isDayToday, nowMinutes: dayNowMins } = useOrgNow();
  const showCurrentTime = isDayToday(date);
  const currentTimeOffset = showCurrentTime
    ? (dayNowMins - (hoursStart * 60)) / 15 * ROW_HEIGHT
    : 0;

  // Calculate overlapping appointments for a stylist
  const getOverlapInfo = (appointments: PhorestAppointment[], targetApt: PhorestAppointment) => {
    const targetStart = parseTimeToMinutes(targetApt.start_time);
    const targetEnd = parseTimeToMinutes(targetApt.end_time);
    
    const overlapping = appointments.filter(apt => {
      const aptStart = parseTimeToMinutes(apt.start_time);
      const aptEnd = parseTimeToMinutes(apt.end_time);
      return !(aptEnd <= targetStart || aptStart >= targetEnd);
    });

    overlapping.sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
    const columnIndex = overlapping.findIndex(apt => apt.id === targetApt.id);
    
    return { columnIndex, totalOverlapping: overlapping.length };
  };

  // ─── Drag Handlers ─────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const appointment = (active.data.current as any)?.appointment as PhorestAppointment | undefined;
    if (!appointment) return;

    // Droppable ID format: "slot-{stylistId}-{HH:MM}"
    const overId = over.id as string;
    if (!overId.startsWith('slot-')) return;

    const parts = overId.split('-');
    // slot-{stylistId}-{HH}:{MM}
    const newStylistId = parts[1];
    const newTime = parts.slice(2).join('-').replace('-', ':');
    // Actually: "slot-<uuid>-HH:MM" — uuid has dashes, so let's parse differently
    // Format: `slot-${stylistId}-${hour}:${minute}`
    // We need to extract the last part as time and everything between first "slot-" and last "-HH:MM" as stylistId
    const timeMatch = overId.match(/(\d{2}:\d{2})$/);
    if (!timeMatch) return;
    const time = timeMatch[1];
    const stylistId = overId.slice(5, overId.length - time.length - 1); // remove "slot-" prefix and "-HH:MM" suffix

    // Don't reschedule if dropped on same time and same stylist
    if (appointment.start_time.slice(0, 5) === time && appointment.stylist_user_id === stylistId) return;

    const previousTime = appointment.start_time;
    const previousStaff = appointment.stylist_user_id;

    toast.info('Moving appointment...');

    reschedule.mutate(
      {
        appointmentId: appointment.id,
        newDate: dateStr,
        newTime: time,
        newStaffId: stylistId !== appointment.stylist_user_id ? stylistId : undefined,
      },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success(`Moved to ${formatTime12h(time)}`, {
            action: {
              label: 'Undo',
              onClick: () => {
                reschedule.mutate({
                  appointmentId: appointment.id,
                  newDate: dateStr,
                  newTime: previousTime,
                  newStaffId: previousStaff || undefined,
                });
              },
            },
            duration: 5000,
          });
        },
      }
    );
  }, [dateStr, reschedule]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full min-h-0 flex-col bg-card rounded-lg border border-border overflow-hidden">
        {/* Closed day banner */}
        {isLocationClosed && (
          <div className="px-3 py-2 bg-muted/60 border-b border-border flex items-center gap-2">
            <ClosedBadge reason={closureReason} />
            <span className="text-xs text-muted-foreground">All time slots are outside regular hours</span>
          </div>
        )}
        {/* Calendar Grid */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div>
            {/* Stylist Headers - frosted glass sticky header */}
            <div className="flex border-b sticky top-0 z-20" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              {/* Week indicator */}
              <div className="w-[70px] shrink-0 bg-sidebar flex items-center justify-center text-xs text-muted-foreground font-medium border-r">
                W {weekNumber}
              </div>
              
              {stylists.map((stylist) => (
                <div 
                  key={stylist.user_id} 
                  className="flex-1 min-w-0 bg-[hsl(var(--sidebar-background))]/95 text-[hsl(var(--sidebar-foreground))] p-2 flex items-center gap-2 border-r border-[hsl(var(--sidebar-border))] last:border-r-0"
                >
                  <Avatar className="h-8 w-8 border border-[hsl(var(--sidebar-foreground))]/20">
                    <AvatarImage src={stylist.photo_url || undefined} />
                    <AvatarFallback className="text-xs bg-[hsl(var(--sidebar-foreground))]/20 text-[hsl(var(--sidebar-foreground))]">
                      {formatDisplayName(stylist.full_name, stylist.display_name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {formatDisplayName(stylist.full_name, stylist.display_name)}
                  </span>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="flex relative">
              {/* Time Labels */}
              <div className="w-[70px] shrink-0 border-r bg-sidebar">
                {timeSlots.map(({ hour, minute, label, isHour, isHalf }) => (
                  <div 
                    key={`${hour}-${minute}`}
                    className={cn(
                      'h-[20px] text-xs text-muted-foreground pr-2 text-right flex items-center justify-end',
                      isHour && 'font-medium'
                    )}
                  >
                    {label && (
                      <span className={cn(isHour ? 'text-foreground' : 'text-muted-foreground/60')}>
                        {label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Stylist Columns */}
              {stylists.map((stylist) => {
                const stylistAppointments = appointmentsByStylist.get(stylist.user_id) || [];
                
                return (
                  <div 
                    key={stylist.user_id} 
                    className="flex-1 min-w-0 relative border-r last:border-r-0"
                  >
                    {/* Time slot backgrounds (droppable) */}
                    {timeSlots.map(({ hour, minute }) => {
                    const isPastSlot = showCurrentTime && (() => {
                      const slotMins = hour * 60 + minute;
                      return slotMins < dayNowMins;
                    })();
                      
                      const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      
                      // Determine if slot is outside operating hours
                      const isOutsideHours = isLocationClosed || (
                        locationHours != null &&
                        (slotTime < locationHours.open || slotTime >= locationHours.close)
                      );
                      
                      const isAvailable = !isOutsideHours && !isPastSlot;
                      const slotId = `slot-${stylist.user_id}-${slotTime}`;
                      
                      return (
                        <DroppableSlot
                          key={slotId}
                          id={slotId}
                          hour={hour}
                          minute={minute}
                          isAvailable={isAvailable}
                          isPastSlot={!!isPastSlot}
                          isOutsideHours={!!isOutsideHours}
                          showCurrentTime={showCurrentTime}
                          isOver={false}
                          onClick={() => {
                            onSlotClick?.(stylist.user_id, slotTime);
                          }}
                        />
                      );
                    })}
                    
                    {/* Assistant Time Block Overlay */}
                    <AssistantBlockOverlay
                      timeBlocks={assistantTimeBlocks}
                      stylistUserId={stylist.user_id}
                      hoursStart={hoursStart}
                      rowHeight={ROW_HEIGHT}
                      onBlockClick={onBlockClick}
                      onBlockResize={onBlockResize}
                      currentUserId={currentUserId}
                    />

                    {/* Appointments */}
                    {stylistAppointments.map((apt) => {
                      const { columnIndex, totalOverlapping } = getOverlapInfo(stylistAppointments, apt);
                      // Check if any confirmed time block overlaps this appointment
                      const aptStartMin = parseTimeToMinutes(apt.start_time);
                      const aptEndMin = parseTimeToMinutes(apt.end_time);
                      const hasCoverage = assistantTimeBlocks.some(b =>
                        b.status === 'confirmed' &&
                        parseTimeToMinutes(b.start_time) < aptEndMin &&
                        parseTimeToMinutes(b.end_time) > aptStartMin &&
                        (b.requesting_user_id === stylist.user_id || b.assistant_user_id === stylist.user_id)
                      );
                      return (
                        <AppointmentCard
                          key={apt.id}
                          appointment={apt}
                          hoursStart={hoursStart}
                          onClick={() => onAppointmentClick(apt)}
                          isSelected={apt.id === selectedAppointmentId}
                          columnIndex={columnIndex}
                          totalOverlapping={totalOverlapping}
                          categoryColors={categoryColors}
                          isAssisting={assistedAppointmentIds?.has(apt.id) || false}
                          hasAssistants={appointmentsWithAssistants?.has(apt.id) || false}
                          colorBy={colorBy}
                          serviceLookup={serviceLookup}
                          assistantNamesMap={assistantNamesMap}
                          assistantProfilesMap={assistantProfilesMap}
                          hasCoverageScheduled={hasCoverage}
                          date={date}
                        />
                      );
                    })}

                    {/* Admin Meeting Cards */}
                    {adminMeetings
                      .filter(m => m.admin_meeting_attendees?.some(a => a.user_id === stylist.user_id) || m.organizer_user_id === stylist.user_id)
                      .map(meeting => (
                        <MeetingGridCard
                          key={meeting.id}
                          meeting={meeting}
                          hoursStart={hoursStart}
                          rowHeight={ROW_HEIGHT}
                          onClick={() => onMeetingClick?.(meeting)}
                        />
                      ))}
                  </div>
                );
              })}

              {/* Current Time Indicator */}
              {showCurrentTime && currentTimeOffset > 0 && currentTimeOffset < timeSlots.length * ROW_HEIGHT && (
                <div 
                  className="absolute left-[70px] right-0 border-t-2 border-destructive pointer-events-none z-[15]"
                  style={{ top: `${currentTimeOffset}px` }}
                >
                  <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-destructive rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeAppointment && (
          <AppointmentCard
            appointment={activeAppointment}
            hoursStart={hoursStart}
            onClick={() => {}}
            categoryColors={categoryColors}
            colorBy={colorBy}
            serviceLookup={serviceLookup}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
