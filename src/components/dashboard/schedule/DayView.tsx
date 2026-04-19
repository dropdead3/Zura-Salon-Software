import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import type { AssistantProfile } from '@/hooks/useAppointmentAssistantNames';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { getLevelColor } from '@/lib/level-colors';
import { format, getWeek } from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { cn, formatPhoneDisplay, formatDisplayName } from '@/lib/utils';
import type { AdminMeeting } from '@/hooks/useAdminMeetings';
import { MeetingGridCard } from './meetings/MeetingCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { useAppointmentDeclinedReasons } from '@/hooks/useAppointmentDeclinedReasons';
import { useRescheduleAppointment } from '@/hooks/useRescheduleAppointment';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/design-tokens';
import { StylistBadge } from './StylistBadge';
import { AssistantBlockOverlay } from './AssistantBlockOverlay';
import { BreakBlockOverlay } from './BreakBlockOverlay';
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

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpatialState } from '@/lib/responsive/useSpatialState';

interface DayViewProps {
  date: Date;
  appointments: PhorestAppointment[];
  stylists: Array<{
    user_id: string;
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
    stylist_level?: string | null;
    is_booking?: boolean | null;
    lead_pool_eligible?: boolean;
    specialties?: string[] | null;
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
  zoomLevel?: number;
  scheduleBlocks?: import('@/hooks/useStaffScheduleBlocks').StaffScheduleBlock[];
  /** Wave 22.2 — Stripe Connect inactive location IDs; surfaces "Setup needed" pill on cards. */
  inactiveConnectLocationIds?: Set<string>;
  /** Display label for the corner cell when org has multiple locations. */
  locationName?: string;
  isMultiLocation?: boolean;
}

// Use consolidated status colors from design tokens
const STATUS_COLORS = APPOINTMENT_STATUS_COLORS;

import { parseTimeToMinutes, formatTime12h, getEventStyle, getOverlapInfo, getCurrentTimeRenderMetrics, formatMinutesAs12h } from '@/lib/schedule-utils';
import { computeUtilizationByStylist } from '@/lib/schedule-utilization';

// Categories that display the X pattern overlay
const BLOCKED_CATEGORIES = ['Block', 'Break'];
// Single source of truth for grid sizing — keep header, body, and indicator in sync
const TIME_GUTTER_WIDTH = 70;
const COLUMN_MIN_WIDTH = 160;
const MIN_COL_WIDTH = COLUMN_MIN_WIDTH;

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
  onClick,
  
  isOver,
  rowHeight = 20,
  slotInterval = 20,
}: {
  id: string;
  hour: number;
  minute: number;
  isAvailable: boolean;
  isPastSlot: boolean;
  isOutsideHours: boolean;
  onClick: () => void;
  
  isOver: boolean;
  rowHeight?: number;
  slotInterval?: number;
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id });
  const highlight = isOver || dndIsOver;
  const [isHovered, setIsHovered] = useState(false);
  const showBadge = isHovered && (isPastSlot || isAvailable || isOutsideHours);
  const badgeLabel = isPastSlot ? 'Unavailable' : formatSlotTime(hour, minute);

  const borderClass = minute === 0
    ? 'border-t border-border dark:border-border/50'
    : minute === 30 && (slotInterval ?? 20) <= 30
      ? 'border-t border-dashed border-border dark:border-border/35'
      : 'border-t border-dotted border-border/60 dark:border-border/15';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group relative',
        borderClass,
        isPastSlot
          ? 'cursor-not-allowed'
          : isOutsideHours
            ? 'cursor-pointer'
            : isAvailable
              ? 'bg-background hover:bg-muted/30 cursor-pointer'
              : 'bg-muted/50',
        highlight && isAvailable && 'bg-primary/20 ring-1 ring-primary/40'
      )}
      style={{
        height: `${rowHeight}px`,
        ...(isOutsideHours && !isPastSlot ? {
          background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.08) 4px, hsl(var(--muted-foreground) / 0.08) 5px)`,
        } : {}),
      }}
      onClick={() => {
        if (isPastSlot || isAvailable || isOutsideHours) onClick();
      }}
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
  rowHeight?: number;
  slotInterval?: number;
  zoomLevel?: number;
  useShortLabels?: boolean;
  declinedReasonLabel?: string | null;
  connectInactive?: boolean;
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
  rowHeight = 20,
  slotInterval = 15,
  zoomLevel = 0,
  useShortLabels = false,
  declinedReasonLabel = null,
  connectInactive = false,
}: AppointmentCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDragOverlay,
  });

  const [isHoveredRight, setIsHoveredRight] = useState(false);
  const hoverBoundsRef = useRef<DOMRect | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragOverlay || isHoveredRight) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX > rect.right - 24) {
      hoverBoundsRef.current = rect;
      setIsHoveredRight(true);
    }
  };

  useEffect(() => {
    if (!isHoveredRight || isDragOverlay) {
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
  }, [isDragOverlay, isHoveredRight]);

  const style = getEventStyle(appointment.start_time, appointment.end_time, hoursStart, rowHeight, slotInterval);
  const pixelHeight = parseInt(style.height);
  const widthPercent = 100 / totalOverlapping;
  const leftPercent = columnIndex * widthPercent;
  const size = getCardSize(appointment.start_time, appointment.end_time, zoomLevel, pixelHeight);

  // Flush edges: no inner gutter between overlapping cards
  const isFirstCol = columnIndex === 0;
  const isLastCol = columnIndex === totalOverlapping - 1;
  const leftOffset = isFirstCol ? 1 : 0;
  const rightPad = isLastCol ? 1 : 0;

  const shrunkWidth = isDragOverlay ? undefined : (isHoveredRight && totalOverlapping <= 1)
    ? `calc(${widthPercent * 0.7}%)`
    : `calc(${widthPercent}% - ${leftOffset + rightPad}px)`;

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
          left: `calc(${leftPercent}% + ${leftOffset}px)`,
          width: shrunkWidth,
          transition: 'width 200ms ease-out',
        } : {}),
      }}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
    >
      <AppointmentCardContent
        appointment={appointment}
        variant="grid"
        size={size}
        pixelHeight={pixelHeight}
        isSelected={isSelected}
        isAssisting={isAssisting}
        hasAssistants={hasAssistants}
        colorBy={colorBy}
        serviceLookup={serviceLookup}
        assistantNamesMap={assistantNamesMap}
        categoryColors={categoryColors}
        
        useShortLabels={useShortLabels}
        declinedReasonLabel={declinedReasonLabel}
        connectInactive={connectInactive}
        onClick={() => {}}
      />
      {/* Right-edge grip indicator */}
      {!isDragOverlay && (
        <div className={cn(
          'absolute right-0 top-0 bottom-0 w-5 flex flex-col items-center justify-center gap-0.5 transition-opacity duration-200',
          isHoveredRight ? 'opacity-60' : 'opacity-0',
        )}>
          <div className="w-0.5 h-1.5 rounded-full bg-foreground/50" />
          <div className="w-0.5 h-1.5 rounded-full bg-foreground/50" />
          <div className="w-0.5 h-1.5 rounded-full bg-foreground/50" />
        </div>
      )}
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
  zoomLevel = 0,
  scheduleBlocks = [],
  inactiveConnectLocationIds,
  locationName,
  isMultiLocation,
}: DayViewProps) {
  const ZOOM_CONFIG: Record<string, { interval: number }> = {
    '-3': { interval: 60 },
    '-2': { interval: 60 },
    '-1': { interval: 30 },
    '0': { interval: 20 },
    '1': { interval: 15 },
    '2': { interval: 10 },
    '3': { interval: 5 },
  };
  const zoomConfig = ZOOM_CONFIG[String(zoomLevel)] ?? ZOOM_CONFIG['0'];
  const slotInterval = zoomConfig.interval;

  const { colorMap: categoryColors } = useServiceCategoryColorsMap();
  const reschedule = useRescheduleAppointment();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: stylistLevels = [] } = useStylistLevels();

  // Wave 21.3 Layer 2 — bulk-fetch decline reasons for completed appointments
  // so the calendar can render the muted "rebook skipped" dot inline.
  const completedAppointmentIds = useMemo(
    () => appointments.filter((a) => a.status === 'completed').map((a) => a.id),
    [appointments],
  );
  const { data: declinedReasonMap } = useAppointmentDeclinedReasons(completedAppointmentIds);

  // Build slug→label map for level badges
  const levelLabelMap = useMemo(() => {
    const m = new Map<string, { label: string; shortLabel: string; index: number }>();
    stylistLevels.forEach((l, i) => m.set(l.slug, { label: l.label, shortLabel: `L${i + 1}`, index: i }));
    return m;
  }, [stylistLevels]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(200);

  // Measure container height for dynamic row sizing
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollViewportWidth, setScrollViewportWidth] = useState(0);
  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
      setScrollViewportWidth(entry.contentRect.width);
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  // Dynamic row height: fill viewport when few slots, scroll when many
  const totalSlots = (hoursEnd - hoursStart) * (60 / slotInterval);
  const MIN_ROW_HEIGHT = 24;
  const availableHeight = containerHeight - 56; // sticky header
  const ROW_HEIGHT = containerHeight > 0
    ? Math.max(MIN_ROW_HEIGHT, Math.floor(availableHeight / totalSlots))
    : MIN_ROW_HEIGHT;

  // Track previous zoom config to detect zoom changes vs date changes
  const prevSlotIntervalRef = useRef(slotInterval);
  const prevRowHeightRef = useRef(ROW_HEIGHT);

  // Auto-scroll: preserve viewport center on zoom, scroll to opening on date change
  useEffect(() => {
    if (!scrollRef.current) return;
    const ref = scrollRef.current;
    const oldSlotInterval = prevSlotIntervalRef.current;
    const oldRowHeight = prevRowHeightRef.current;
    const isZoomChange = oldSlotInterval !== slotInterval || oldRowHeight !== ROW_HEIGHT;
    prevSlotIntervalRef.current = slotInterval;
    prevRowHeightRef.current = ROW_HEIGHT;

    if (isZoomChange) {
      // Preserve the time the user is looking at
      const viewportCenter = ref.scrollTop + ref.clientHeight / 2;
      const oldTotalSlots = (hoursEnd - hoursStart) * (60 / oldSlotInterval);
      const oldTotalHeight = oldTotalSlots * oldRowHeight;
      const fraction = oldTotalHeight > 0 ? viewportCenter / (ref.scrollHeight || 1) : 0;
      requestAnimationFrame(() => {
        const newTop = fraction * ref.scrollHeight - ref.clientHeight / 2;
        ref.scrollTo({ top: Math.max(0, newTop), behavior: 'instant' });
      });
    } else {
      // Date change or initial mount — scroll to opening time
      let openHour = hoursStart;
      if (locationHours?.open) {
        const [h] = locationHours.open.split(':').map(Number);
        openHour = h;
      }
      const scrollToHour = Math.max(openHour - 1, hoursStart);
      const slotsOffset = (scrollToHour - hoursStart) * (60 / slotInterval);
      const top = slotsOffset * ROW_HEIGHT;
      requestAnimationFrame(() => {
        ref.scrollTo({ top, behavior: 'instant' });
      });
    }
  }, [date.toDateString(), locationHours?.open, hoursStart, slotInterval, ROW_HEIGHT, hoursEnd]);

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
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const isHour = minute === 0;
        const isHalf = minute === 30;
        const label = isHour ? formatHour(hour) : String(minute);
        slots.push({ hour, minute, label, isHour, isHalf });
      }
    }
    return slots;
  }, [hoursStart, hoursEnd, slotInterval]);

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

  // Per-stylist utilization: booked client minutes / available minutes
  // Uses the shared helper so the dropdown badge and column sort stay in sync.
  const utilizationByStylist = useMemo(
    () => computeUtilizationByStylist(stylists, appointments, dateStr, hoursStart, hoursEnd),
    [stylists, appointments, dateStr, hoursStart, hoursEnd],
  );

  // Sort stylists by highest capacity booked (utilization) descending
  const sortedStylists = useMemo(() => {
    return [...stylists].sort((a, b) => {
      const aUtil = utilizationByStylist.get(a.user_id) || 0;
      const bUtil = utilizationByStylist.get(b.user_id) || 0;
      if (bUtil !== aUtil) return bUtil - aUtil;
      // Tie-break alphabetically
      const aName = formatDisplayName(a.full_name, a.display_name);
      const bName = formatDisplayName(b.full_name, b.display_name);
      return aName.localeCompare(bName);
    });
  }, [stylists, utilizationByStylist]);

  const requiredGridWidth = 70 + (sortedStylists.length * MIN_COL_WIDTH);
  const needsHorizontalScroll = scrollViewportWidth > 0 && requiredGridWidth > scrollViewportWidth;

  
  useEffect(() => {
    const el = headerRowRef.current;
    if (!el) return;
    const count = sortedStylists.length;
    if (count === 0) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width - 70; // subtract week indicator
        const colWidth = Math.max(containerWidth / count, MIN_COL_WIDTH);
        setColumnWidth(colWidth);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sortedStylists.length]);

  const activeAppointment = useMemo(() => {
    if (!activeId) return null;
    return appointments.find(a => a.id === activeId) || null;
  }, [activeId, appointments]);

  // Current time indicator
  const { isToday: isDayToday, nowMinutes: dayNowMins } = useOrgNow();
  const showCurrentTime = isDayToday(date);
  const { linePx: currentTimeLinePx, overlayPx: currentTimeOverlayPx, visible: currentTimeVisible } =
    getCurrentTimeRenderMetrics(dayNowMins, hoursStart, slotInterval, ROW_HEIGHT, timeSlots.length);

  // getOverlapInfo is now imported from @/lib/schedule-utils

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
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <div style={{ width: needsHorizontalScroll ? requiredGridWidth : '100%' }}>
            {/* Stylist Headers - frosted glass sticky header */}
            <div ref={headerRowRef} className="flex border-b sticky top-0 z-20" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              {/* Corner cell — location name (multi-location) or week number */}
              {isMultiLocation && locationName ? (() => {
                const longestWord = Math.max(...locationName.split(/\s+/).map(w => w.length));
                const sizeClass =
                  longestWord > 11 ? 'text-[7px]' :
                  longestWord > 9  ? 'text-[8px]' :
                  longestWord > 7  ? 'text-[9px]' :
                                     'text-[10px]';
                return (
                  <div
                    className="w-[70px] shrink-0 bg-sidebar flex items-center justify-center px-1 py-1 text-muted-foreground border-r"
                    title={locationName}
                  >
                    <span className={cn(
                      'font-display tracking-wide uppercase text-center leading-[1.05] break-words',
                      sizeClass
                    )}>
                      {locationName}
                    </span>
                  </div>
                );
              })() : (
                <div className="w-[70px] shrink-0 bg-sidebar flex items-center justify-center text-xs text-muted-foreground font-medium border-r">
                  W {weekNumber}
                </div>
              )}
              
               {sortedStylists.map((stylist, idx) => {
                const levelInfo = stylist.stylist_level ? levelLabelMap.get(stylist.stylist_level) : null;
                const pct = utilizationByStylist.get(stylist.user_id) ?? 0;
                const acceptingClients = stylist.is_booking !== false && stylist.lead_pool_eligible !== false;

                return (
                  <StylistHeaderCell
                    key={stylist.user_id}
                    stylist={stylist}
                    idx={idx}
                    pct={pct}
                    acceptingClients={acceptingClients}
                    levelInfo={levelInfo}
                  />
                );
              })}
            </div>


            {/* Time Grid */}
            <div className="flex relative" style={{ minWidth: requiredGridWidth }}>
              {/* Time Labels */}
              <div className="shrink-0 border-r bg-sidebar" style={{ width: `${TIME_GUTTER_WIDTH}px` }}>
                {timeSlots.map(({ hour, minute, label, isHour, isHalf }) => (
                  <div 
                    key={`${hour}-${minute}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={cn(
                      'text-xs text-muted-foreground pr-2 text-right flex items-center justify-end',
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

              {/* Stylist Columns wrapper — relative anchor for the current-time indicator */}
              <div className="flex-1 flex relative min-w-0">
                {sortedStylists.map((stylist, idx) => {
                 const stylistAppointments = appointmentsByStylist.get(stylist.user_id) || [];
                 
                 return (
                    <div 
                      key={stylist.user_id} 
                      className={cn("flex-1 relative border-r-2 border-r-[hsl(var(--sidebar-border))] last:border-r-0", idx % 2 === 1 && "bg-muted/15")}
                      style={{ minWidth: `${COLUMN_MIN_WIDTH}px` }}
                    >
                      {/* Past-time overlay — pixel-aligned to the current-time indicator */}
                      {showCurrentTime && currentTimeOverlayPx > 0 && (
                        <div
                          className="absolute inset-x-0 top-0 bg-muted/40 pointer-events-none z-[1]"
                          style={{ height: `${currentTimeOverlayPx}px` }}
                        />
                      )}
                      {/* Time slot backgrounds (droppable) */}
                     {timeSlots.map(({ hour, minute }) => {
                      // "Fully past" — slot is unavailable only after its END time has elapsed,
                      // so the slot the indicator line is currently inside remains bookable.
                      const isPastSlot = showCurrentTime && (() => {
                        const slotMins = hour * 60 + minute;
                        return slotMins + slotInterval <= dayNowMins;
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
                           isOver={false}
                           rowHeight={ROW_HEIGHT}
                           slotInterval={slotInterval}
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
                       slotInterval={slotInterval}
                       onBlockClick={onBlockClick}
                       onBlockResize={onBlockResize}
                       currentUserId={currentUserId}
                     />

                     {/* Break / Lunch / Blocked Time Overlay */}
                     <BreakBlockOverlay
                       blocks={scheduleBlocks}
                       stylistUserId={stylist.user_id}
                       hoursStart={hoursStart}
                       rowHeight={ROW_HEIGHT}
                       slotInterval={slotInterval}
                     />


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
                         rowHeight={ROW_HEIGHT}
                         slotInterval={slotInterval}
                         zoomLevel={zoomLevel}
                         useShortLabels={sortedStylists.length >= 3}
                         declinedReasonLabel={declinedReasonMap?.get(apt.id)?.label ?? null}
                         connectInactive={!!(apt.location_id && inactiveConnectLocationIds?.has(apt.location_id))}
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
                          slotInterval={slotInterval}
                          onClick={() => onMeetingClick?.(meeting)}
                        />
                      ))}
                  </div>
                );
              })}

                {/* Current Time Indicator — spans full width of stylist columns track */}
                {showCurrentTime && currentTimeVisible && (
                  <div
                    className="absolute border-t-2 border-primary pointer-events-none z-[15]"
                    style={{
                      top: `${currentTimeLinePx}px`,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-primary rounded-full" />
                    <div className="absolute -top-2.5 right-full mr-2 bg-primary/15 text-primary ring-1 ring-primary/30 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                      {formatMinutesAs12h(dayNowMins)}
                    </div>
                  </div>
                )}
              </div>
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
            rowHeight={ROW_HEIGHT}
            slotInterval={slotInterval}
            zoomLevel={zoomLevel}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
