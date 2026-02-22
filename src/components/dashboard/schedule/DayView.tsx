import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import type { AssistantProfile } from '@/hooks/useAppointmentAssistantNames';
import { format, isToday, getWeek } from 'date-fns';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { cn, formatPhoneDisplay, formatDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, AlertTriangle, XCircle, Users, User, Repeat, RotateCcw, Star, ArrowRightLeft } from 'lucide-react';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { getCategoryColor, SPECIAL_GRADIENTS, isGradientMarker, getGradientFromMarker, getDarkCategoryStyle } from '@/utils/categoryColors';
import { useRescheduleAppointment } from '@/hooks/useRescheduleAppointment';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/design-tokens';
import { getClientInitials, getAvatarColor, formatServicesWithDuration, sortServices } from '@/lib/appointment-card-utils';
import { StylistBadge } from './StylistBadge';
import { AssistantBlockOverlay } from './AssistantBlockOverlay';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatRelativeTime } from '@/lib/format';
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
  onSlotContextMenu?: (stylistId: string, time: string, e: React.MouseEvent) => void;
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

// Removed local formatPhone — using formatPhoneDisplay from @/lib/utils

// Categories that display the X pattern overlay
const BLOCKED_CATEGORIES = ['Block', 'Break'];

// Helper to detect consultation category
const isConsultationCategory = (category: string | null | undefined) => {
  if (!category) return false;
  return category.toLowerCase().includes('consult');
};

// Default consultation gradient (teal-lime) for fallback
const DEFAULT_CONSULTATION_GRADIENT = SPECIAL_GRADIENTS['teal-lime'];

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
  onContextMenu,
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
  onContextMenu?: (e: React.MouseEvent) => void;
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
      onContextMenu={(e) => {
        if ((isAvailable || isOutsideHours) && !isPastSlot && onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e);
        }
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

// ─── Draggable Appointment Card ────────────────────────────────────
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
  assistantProfilesMap,
  hasCoverageScheduled = false,
}: AppointmentCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDragOverlay,
  });

  const style = getEventStyle(appointment.start_time, appointment.end_time, hoursStart);
  const statusColors = STATUS_COLORS[appointment.status];
  const duration = parseTimeToMinutes(appointment.end_time) - parseTimeToMinutes(appointment.start_time);
  const isCompact = duration <= 30;

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
    if (!useCategoryColor || !serviceLookup || displayGradient) return null;
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
  }, [appointment.service_name, appointment.service_category, serviceLookup, categoryColors, useCategoryColor, displayGradient]);

  // Calculate width and offset for overlapping appointments
  const widthPercent = 100 / totalOverlapping;
  const leftPercent = columnIndex * widthPercent;

  // No-show and cancelled indicators
  const isNoShow = appointment.status === 'no_show';
  const isCancelled = appointment.status === 'cancelled';

  // Dark mode detection (reactive via context)
  const { resolvedTheme } = useDashboardTheme();
  const isDark = resolvedTheme === 'dark';
  const darkStyle = useMemo(() => {
    if (!isDark || !useCategoryColor || displayGradient) return null;
    return getDarkCategoryStyle(catColor.bg);
  }, [isDark, useCategoryColor, displayGradient, catColor.bg]);

  return (
        <div
          ref={!isDragOverlay ? setNodeRef : undefined}
          {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
          className={cn(
            'absolute z-10 rounded-md cursor-pointer transition-transform duration-200 ease-out overflow-hidden group hover:shadow-md hover:z-20 hover:scale-[1.02]',
            // Left accent bar in both light and dark (solid style)
            !displayGradient && 'border-l-4',
            !useCategoryColor && !displayGradient && statusColors.bg,
            !useCategoryColor && !displayGradient && statusColors.border,
            !useCategoryColor && !displayGradient && statusColors.text,
            isCancelled && 'opacity-60',
            isNoShow && 'ring-2 ring-destructive ring-inset',
            // Selection visual handled by detail panel, no ring stroke
            isDragging && !isDragOverlay && 'opacity-30',
            isDragOverlay && 'shadow-2xl ring-2 ring-primary scale-105 z-50',
            displayGradient && 'shadow-lg',
            // Pending redo: amber dashed border treatment
            appointment.status === 'pending' && (appointment as any).is_redo && 'border-dashed border-2 border-amber-500 dark:border-amber-400',
          )}
          style={{
            ...(isDragOverlay ? { position: 'relative', width: '200px', height: style.height } : style),
            ...(!isDragOverlay ? {
              left: `calc(${leftPercent}% + 2px)`,
              width: `calc(${widthPercent}% - 4px)`,
            } : {}),
            ...(displayGradient ? {
              background: displayGradient.background,
              color: displayGradient.textColor,
            } : useCategoryColor && isDark && darkStyle ? {
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
              borderWidth: '0 0 0 4px',
              borderStyle: 'solid',
              boxShadow: 'none',
              opacity: 1,
              backdropFilter: 'none',
            } : {}),
          }}
          onClick={(e) => {
            // Only fire click if not dragging
            if (!isDragging) onClick();
          }}
        >
          {/* Assistant badges top-right (DayView: column = stylist, so show assistants instead) */}
          {!isCompact && (() => {
            const profiles = assistantProfilesMap?.get(appointment.id);
            if (!profiles || profiles.length === 0) return null;
            return (
              <div className="absolute top-0.5 right-0.5 z-10 flex items-center -space-x-1">
                {profiles.map((p, i) => {
                  const initials = (() => {
                    const name = p.display_name || p.full_name;
                    if (!name?.trim()) return '?';
                    const parts = name.trim().split(/\s+/);
                    if (parts.length === 1) return parts[0][0].toUpperCase();
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  })();
                  const displayName = formatDisplayName(p.full_name, p.display_name);
                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div className="shrink-0">
                          {p.photo_url ? (
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={p.photo_url} />
                              <AvatarFallback className="text-[8px] bg-muted/80">{initials}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium bg-muted/80 backdrop-blur-sm text-muted-foreground">
                              {initials}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="end" sideOffset={4} className="text-xs z-[100]">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 shrink-0 opacity-70" />
                          <span>{displayName}</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })()}
          {/* No-show overlay */}
          {isNoShow && (
            <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center z-10">
              <div className="absolute top-1 right-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
            </div>
          )}
          
          {/* Cancelled overlay with strikethrough */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-y-1/2 left-0 right-0 h-0.5 bg-current opacity-50" />
            </div>
          )}
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
          <div className="px-1.5 py-0.5 relative z-10" style={serviceBands ? { textShadow: '0 0 3px rgba(0,0,0,0.15)' } : undefined}>
            {isCompact ? (
              <div className="text-xs font-medium truncate flex items-center gap-1">
                {(appointment as any).is_redo && (
                  <RotateCcw className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                )}
                {appointment.recurrence_group_id && (
                  <Repeat className="h-2.5 w-2.5 opacity-60 shrink-0" />
                )}
                {(appointment as any).rescheduled_at && (
                  <ArrowRightLeft className="h-2.5 w-2.5 text-blue-500 dark:text-blue-400 shrink-0" />
                )}
                {isAssisting && (
                  <span className="bg-accent/80 text-accent-foreground text-[8px] px-1 py-px rounded-sm font-medium shrink-0">AST</span>
                )}
                {!isAssisting && hasAssistants && (
                  <Users className="h-3 w-3 opacity-60 shrink-0" />
                )}
                {appointment.is_new_client && (
                  <Star className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                )}
                {appointment.client_name}
              </div>
            ) : (
              <>
                <div className="text-xs font-medium truncate flex items-center gap-1">
                  {(appointment as any).is_redo && (
                    <RotateCcw className="h-3 w-3 text-amber-500 shrink-0" />
                  )}
                  {appointment.recurrence_group_id && (
                    <Repeat className="h-3 w-3 opacity-60 shrink-0" />
                  )}
                  {(appointment as any).rescheduled_at && (
                    <ArrowRightLeft className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />
                  )}
                  {(appointment.status === 'confirmed' || appointment.status === 'checked_in') && (
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0 ring-1 ring-white/50',
                      appointment.status === 'confirmed' ? 'bg-green-400' : 'bg-blue-400'
                    )} />
                  )}
                  {isAssisting && (
                    <span className="bg-accent/80 text-accent-foreground text-[8px] px-1 py-px rounded-sm font-medium shrink-0">ASSISTING</span>
                  )}
                   {!isAssisting && hasAssistants && (
                    <Users className="h-3 w-3 opacity-60 shrink-0" />
                  )}
                  {/* Client avatar initials */}
                  <span className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium shrink-0', getAvatarColor(appointment.client_name))}>
                    {getClientInitials(appointment.client_name)}
                  </span>
                  {appointment.client_name}
                  {appointment.is_new_client && (
                    <span className="text-[8px] px-1 py-px rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium shrink-0">NEW</span>
                  )}
                  {appointment.client_phone && (
                    <span className="font-normal opacity-80">
                      {formatPhoneDisplay(appointment.client_phone)}
                    </span>
                  )}
                </div>
                {/* Per-service time-slot positioned labels on tall cards */}
                {duration >= 60 && serviceBands && serviceBands.length > 1 ? (
                  <div className="flex flex-col">
                    {serviceBands.map((band, i) => (
                      <div key={i} className="text-[10px] opacity-90 truncate">
                        {band.name} <span className="opacity-70">{band.duration}min</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs opacity-90 truncate">
                    {(duration >= 45 && formatServicesWithDuration(appointment.service_name, serviceLookup)) || appointment.service_name}
                  </div>
                )}
                {/* Stylist/assistant info now in top-right badge tooltip */}
                {duration >= 60 && (
                  <div className="text-xs opacity-80 mt-0.5 flex items-center justify-between">
                    <span>{formatTime12h(appointment.start_time)} - {formatTime12h(appointment.end_time)}</span>
                    {appointment.total_price != null && appointment.total_price > 0 && (
                      <BlurredAmount className="text-[10px] opacity-70">
                        ${appointment.total_price.toFixed(0)}
                      </BlurredAmount>
                    )}
                  </div>
                )}
                {/* Rescheduled from line - below time */}
                {duration >= 45 && (appointment as any).rescheduled_at && (appointment as any).rescheduled_from_time && (
                  <div className="text-[10px] opacity-70 italic truncate flex items-center gap-0.5">
                    <ArrowRightLeft className="h-2.5 w-2.5 shrink-0" />
                    Moved from {formatTime12h((appointment as any).rescheduled_from_time)}
                  </div>
                )}
              </>
            )}
          </div>
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
  onSlotContextMenu,
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
  const now = new Date();
  const showCurrentTime = isToday(date);
  const currentTimeOffset = showCurrentTime
    ? ((now.getHours() * 60 + now.getMinutes()) - (hoursStart * 60)) / 15 * ROW_HEIGHT
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

    reschedule.mutate(
      {
        appointmentId: appointment.id,
        newDate: dateStr,
        newTime: time,
        newStaffId: stylistId !== appointment.stylist_user_id ? stylistId : undefined,
      },
      {
        onSuccess: () => {
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
      <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
        {/* Closed day banner */}
        {isLocationClosed && (
          <div className="px-3 py-2 bg-muted/60 border-b border-border flex items-center gap-2">
            <ClosedBadge reason={closureReason} />
            <span className="text-xs text-muted-foreground">All time slots are outside regular hours</span>
          </div>
        )}
        {/* Calendar Grid */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="min-w-[600px]">
            {/* Stylist Headers - frosted glass sticky header */}
            <div className="flex border-b sticky top-0 z-10" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              {/* Week indicator */}
              <div className="w-[70px] shrink-0 bg-sidebar flex items-center justify-center text-xs text-muted-foreground font-medium border-r">
                W {weekNumber}
              </div>
              
              {stylists.map((stylist) => (
                <div 
                  key={stylist.user_id} 
                  className="flex-1 min-w-[160px] bg-foreground/95 text-background p-2 flex items-center gap-2 border-r border-foreground/20 last:border-r-0"
                >
                  <Avatar className="h-8 w-8 border border-background/20">
                    <AvatarImage src={stylist.photo_url || undefined} />
                    <AvatarFallback className="text-xs bg-background/20 text-background">
                      {(stylist.display_name || stylist.full_name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {stylist.display_name || stylist.full_name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
            {/* Gradient fade below header */}
            <div className="h-3 bg-gradient-to-b from-muted/40 to-transparent pointer-events-none sticky top-[52px] z-[9]" />

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
                    className="flex-1 min-w-[160px] relative border-r last:border-r-0"
                  >
                    {/* Time slot backgrounds (droppable) */}
                    {timeSlots.map(({ hour, minute }) => {
                      const isPastSlot = showCurrentTime && (() => {
                        const slotDate = new Date(date);
                        slotDate.setHours(hour, minute, 0, 0);
                        return slotDate < now;
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
                          onContextMenu={(e) => {
                            onSlotContextMenu?.(stylist.user_id, slotTime, e);
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
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Current Time Indicator */}
              {showCurrentTime && currentTimeOffset > 0 && currentTimeOffset < timeSlots.length * ROW_HEIGHT && (
                <div 
                  className="absolute left-[70px] right-0 border-t-2 border-destructive pointer-events-none z-20"
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
