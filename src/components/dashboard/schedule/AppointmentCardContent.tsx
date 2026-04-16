/**
 * Shared appointment card content renderer.
 * Used by DayView (grid), WeekView (grid), and AgendaView (agenda).
 * 
 * Grid variant: renders inline content for absolutely-positioned cards.
 * Agenda variant: renders full card with time column, divider, chevron.
 */
import { useMemo } from 'react';
import { cn, formatPhoneDisplay, formatDisplayName } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, ChevronRight, ArrowRightLeft, Users } from 'lucide-react';

import { getClientInitials, getAvatarColor, formatServicesWithDuration, sortServices } from '@/lib/appointment-card-utils';
import { StylistBadge } from './StylistBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatRelativeTime } from '@/lib/format';
import { IndicatorCluster, type IndicatorFlags } from './appointment-card-indicators';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { getCategoryColor, SPECIAL_GRADIENTS, isGradientMarker, getGradientFromMarker, getDarkCategoryStyle, boostPaleCategoryColor, getContrastingTextColor, deriveLightModeColor } from '@/utils/categoryColors';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';

// ─── Shared helpers ───────────────────────────────────────────
const BLOCKED_CATEGORIES = ['Block', 'Break'];

const isConsultationCategory = (category: string | null | undefined) => {
  if (!category) return false;
  return category.toLowerCase().includes('consult');
};

const DEFAULT_CONSULTATION_GRADIENT = SPECIAL_GRADIENTS['teal-lime'];

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ─── Types ────────────────────────────────────────────────────
export type CardSize = 'compact' | 'medium' | 'full';

export interface AppointmentCardContentProps {
  appointment: PhorestAppointment;
  variant: 'grid' | 'agenda';
  size: CardSize;
  isSelected?: boolean;
  isAssisting?: boolean;
  hasAssistants?: boolean;
  colorBy?: 'status' | 'service' | 'stylist';
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  assistantProfilesMap?: Map<string, import('@/hooks/useAppointmentAssistantNames').AssistantProfile[]>;
  categoryColors: Record<string, { bg: string; text: string; abbr: string }>;
  
  showStylistBadge?: boolean;
  showClientPhone?: boolean;
  showClientAvatar?: boolean;
  onClick: () => void;
}

// ─── Compute indicator flags ──────────────────────────────────
function getIndicatorFlags(
  appointment: PhorestAppointment,
  isAssisting: boolean,
  hasAssistants: boolean,
): IndicatorFlags {
  return {
    isNewClient: appointment.is_new_client || false,
    isRedo: !!(appointment as any).is_redo,
    isRescheduled: !!(appointment as any).rescheduled_at,
    isRecurring: !!appointment.recurrence_group_id,
    isAssisting,
    hasAssistants,
  };
}

// ─── Grid Overlays (Block/Break, Gradient, No-Show, Cancelled) ─
function CardOverlays({
  appointment,
  displayGradient,
  useCategoryColor,
  catColor,
}: {
  appointment: PhorestAppointment;
  displayGradient: ReturnType<typeof getGradientFromMarker>;
  useCategoryColor: boolean;
  catColor: { bg: string; text: string };
}) {
  const isNoShow = appointment.status === 'no_show';
  const isCancelled = appointment.status === 'cancelled';

  return (
    <>
      {isNoShow && (
        <div className="absolute inset-0 bg-destructive/20 z-10 pointer-events-none" />
      )}
      {isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-y-1/2 left-0 right-0 h-0.5 bg-current opacity-50" />
        </div>
      )}
      {displayGradient && (
        <>
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
          <div
            className="absolute inset-0 pointer-events-none animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </>
      )}
      {BLOCKED_CATEGORIES.includes(appointment.service_category || '') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom right, transparent calc(50% - 1px), ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% - 1px), ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% + 1px), transparent calc(50% + 1px))`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom left, transparent calc(50% - 1px), ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% - 1px), ${useCategoryColor ? catColor.text : 'currentColor'}19 calc(50% + 1px), transparent calc(50% + 1px))`,
            }}
          />
        </div>
      )}
    </>
  );
}

// ─── Service bands ────────────────────────────────────────────
function useServiceBands(
  appointment: PhorestAppointment,
  useCategoryColor: boolean,
  serviceLookup: Map<string, ServiceLookupEntry> | undefined,
  categoryColors: Record<string, { bg: string; text: string; abbr: string }>,
  displayGradient: any,
  skipForCompact: boolean
) {
  return useMemo(() => {
    if (!useCategoryColor || !serviceLookup || displayGradient || skipForCompact) return null;
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
  }, [appointment.service_name, appointment.service_category, serviceLookup, categoryColors, useCategoryColor, displayGradient, skipForCompact]);
}

// ─── Grid Content (compact / medium / full) ───────────────────
function GridContent({
  appointment,
  size,
  indicatorFlags,
  serviceLookup,
  assistantNamesMap,
  assistantProfilesMap,
  serviceBands,
  duration,
  showStylistBadge,
  showClientPhone,
  showClientAvatar,
}: {
  appointment: PhorestAppointment;
  size: CardSize;
  indicatorFlags: IndicatorFlags;
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  assistantProfilesMap?: Map<string, import('@/hooks/useAppointmentAssistantNames').AssistantProfile[]>;
  serviceBands: any[] | null;
  duration: number;
  showStylistBadge?: boolean;
  showClientPhone?: boolean;
  showClientAvatar?: boolean;
}) {
  if (size === 'compact') {
    return (
      <div className="px-2 py-1 relative z-10 overflow-hidden">
        <IndicatorCluster
          flags={indicatorFlags}
          size="compact"
          className="absolute top-0.5 right-1 z-20"
        />
        <div className="text-xs font-medium truncate pr-8">
          {appointment.client_name}
        </div>
      </div>
    );
  }

  const statusKey = (appointment.status || 'booked') as keyof typeof APPOINTMENT_STATUS_BADGE;
  const badge = APPOINTMENT_STATUS_BADGE[statusKey] || APPOINTMENT_STATUS_BADGE.booked;
  const statusLabel = (size === 'medium' || showStylistBadge) ? badge.shortLabel : badge.label;

  return (
    <div className="px-2 py-1 relative z-10 overflow-hidden h-full" style={serviceBands ? { textShadow: '0 0 3px rgba(0,0,0,0.15)' } : undefined}>
      {showStylistBadge ? (
        <>
          {/* Weekly view: status badge top-left */}
          <div className="absolute top-1 left-1 z-20 flex items-center gap-1">
            <IndicatorCluster flags={indicatorFlags} size={size} />
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border',
              badge.bg, badge.text, badge.border
            )}>
              {badge.label}
            </span>
          </div>
          {/* Weekly view: stylist photo top-right */}
          {appointment.stylist_profile && (
            <div className="absolute top-1 right-1 z-20">
              <StylistBadge
                stylistProfile={appointment.stylist_profile}
                assistantNames={assistantNamesMap?.get(appointment.id)}
                assistantProfiles={assistantProfilesMap?.get(appointment.id)}
              />
            </div>
          )}
          {/* Client name below top row */}
          <div className="text-sm font-medium truncate pt-7 flex items-center gap-1">
            <span className="truncate">{appointment.client_name}</span>
            {showClientPhone && appointment.client_phone && (
              <span className="font-normal opacity-80 text-xs shrink-0">
                {formatPhoneDisplay(appointment.client_phone)}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Day view: NC/RC badge top-left */}
          {showClientAvatar && (
            <div className="absolute top-1 left-1 z-20">
              <span className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium shrink-0',
                appointment.is_new_client
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              )}>
                {appointment.is_new_client ? 'NC' : 'RC'}
              </span>
            </div>
          )}
          {/* Day view: indicators + status badge top-right */}
          <div className="absolute top-1 right-1 z-20 flex items-center gap-1">
            <IndicatorCluster flags={indicatorFlags} size={size} />
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border',
              badge.bg, badge.text, badge.border
            )}>
              {badge.label}
            </span>
          </div>
          {/* Client name + phone below badges */}
          <div className="text-sm font-medium truncate pt-6">
            <span className="truncate">{appointment.client_name}</span>
            {showClientPhone && appointment.client_phone && (
              <span className="font-normal opacity-80 text-xs ml-1">
                {formatPhoneDisplay(appointment.client_phone)}
              </span>
            )}
          </div>
        </>
      )}

      {/* Service line */}
      {duration >= 60 && serviceBands && serviceBands.length > 1 ? (
        <div className="text-[13px] opacity-90 truncate">
          {serviceBands.map(b => `${b.name} ${b.duration}min`).join(' + ')}
        </div>
      ) : (
        <div className="text-[13px] opacity-90 truncate">
          {(duration >= 45 && formatServicesWithDuration(appointment.service_name, serviceLookup)) || appointment.service_name}
        </div>
      )}

      {/* Assisted by line — only when the card has enough vertical space */}
      {size === 'full' && duration >= 90 && (() => {
        const names = assistantNamesMap?.get(appointment.id);
        if (!names || names.length === 0) return null;
        return (
          <div className="text-[11px] opacity-70 truncate flex items-center gap-1">
            <span className="opacity-50">└</span> Assisted by {names.join(', ')}
          </div>
        );
      })()}

      {/* Time + price — defer until taller cards so 60min cards stay clean */}
      {size === 'full' && duration >= 75 && (
        <div className="text-[13px] opacity-80 mt-0.5 flex items-center justify-between">
          <span>{formatTime12h(appointment.start_time)} - {formatTime12h(appointment.end_time)}</span>
          {appointment.total_price != null && appointment.total_price > 0 && (
            <BlurredAmount className="text-[11px] opacity-70">
              ${appointment.total_price.toFixed(0)}
            </BlurredAmount>
          )}
        </div>
      )}

      {/* Rescheduled from line — reserve for the tallest cards only */}
      {size === 'full' && duration >= 105 && (appointment as any).rescheduled_at && (appointment as any).rescheduled_from_time && (
        <div className="text-[10px] opacity-70 italic truncate flex items-center gap-0.5">
          <ArrowRightLeft className="h-2.5 w-2.5 shrink-0" />
          Moved from {formatTime12h((appointment as any).rescheduled_from_time)}
        </div>
      )}
    </div>
  );
}

// ─── Agenda Content ───────────────────────────────────────────
function AgendaContent({
  appointment,
  indicatorFlags,
  serviceLookup,
  assistantNamesMap,
  hasAssistants,
  onClick,
}: {
  appointment: PhorestAppointment;
  indicatorFlags: IndicatorFlags;
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantNamesMap?: Map<string, string[]>;
  hasAssistants: boolean;
  onClick: () => void;
}) {
  const statusConfig = APPOINTMENT_STATUS_BADGE[appointment.status];
  const isCancelledOrNoShow = appointment.status === 'cancelled' || appointment.status === 'no_show';
  const duration = parseTimeToMinutes(appointment.end_time) - parseTimeToMinutes(appointment.start_time);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        isCancelledOrNoShow && 'opacity-60'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 min-h-[56px]">
        <div className="flex items-start gap-4">
          {/* Time Column */}
          <div className="text-center shrink-0 w-16">
            <div className="text-lg font-medium">
              {formatTime12h(appointment.start_time).replace(' ', '')}
            </div>
            <div className="text-xs text-muted-foreground">
              to {formatTime12h(appointment.end_time).replace(' ', '')}
            </div>
            {duration > 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{duration} min</div>
            )}
          </div>

          {/* Divider */}
          <div className={cn('w-1 self-stretch rounded-full', statusConfig.bg)} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5', getAvatarColor(appointment.client_name))}>
                  {getClientInitials(appointment.client_name)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-medium text-base">{appointment.client_name}</h4>
                    <IndicatorCluster flags={indicatorFlags} size="full" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatServicesWithDuration(appointment.service_name, serviceLookup) || appointment.service_name}
                  </p>
                  {(appointment as any).rescheduled_at && (appointment as any).rescheduled_from_time && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic flex items-center gap-1 mt-0.5">
                      <ArrowRightLeft className="h-3 w-3 shrink-0" />
                      Moved from {(appointment as any).rescheduled_from_date !== appointment.appointment_date ? `${(appointment as any).rescheduled_from_date} ` : ''}{formatTime12h((appointment as any).rescheduled_from_time)} · {formatRelativeTime((appointment as any).rescheduled_at)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {appointment.stylist_profile && (
                  <StylistBadge
                    stylistProfile={appointment.stylist_profile}
                    assistantNames={assistantNamesMap?.get(appointment.id)}
                    size="md"
                  />
                )}
                {appointment.total_price != null && appointment.total_price > 0 && (
                  <BlurredAmount className="text-sm font-medium text-muted-foreground">
                    ${appointment.total_price.toFixed(0)}
                  </BlurredAmount>
                )}
                <Badge className={cn('shrink-0', statusConfig.bg, statusConfig.text)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {appointment.client_phone && (
                <a
                  href={`tel:${appointment.client_phone}`}
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhoneDisplay(appointment.client_phone)}
                </a>
              )}
              {appointment.stylist_profile && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={appointment.stylist_profile.photo_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {formatDisplayName(appointment.stylist_profile.full_name, appointment.stylist_profile.display_name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {formatDisplayName(appointment.stylist_profile.full_name, appointment.stylist_profile.display_name)}
                </div>
              )}
              {hasAssistants && assistantNamesMap?.get(appointment.id) && (
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  w/ {assistantNamesMap.get(appointment.id)!.join(', ')}
                </div>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}



// ─── Main Component ───────────────────────────────────────────
export function AppointmentCardContent({
  appointment,
  variant,
  size,
  isSelected = false,
  isAssisting = false,
  hasAssistants = false,
  colorBy = 'service',
  serviceLookup,
  assistantNamesMap,
  assistantProfilesMap,
  categoryColors,
  
  showStylistBadge = false,
  showClientPhone = true,
  showClientAvatar = true,
  onClick,
}: AppointmentCardContentProps) {
  // ─── All hooks run unconditionally ────────────────────────
  const { resolvedTheme } = useDashboardTheme();
  const isDark = resolvedTheme === 'dark';

  const statusColors = APPOINTMENT_STATUS_COLORS[appointment.status];

  // Resolve the display category: stored → serviceLookup primary → service-name heuristic
  const resolvedCategory = useMemo(() => {
    // 1. Use stored service_category if it resolves to a known color
    const stored = appointment.service_category;
    if (stored && categoryColors[stored.toLowerCase()]) return stored;

    // 2. Look up primary service category from serviceLookup
    if (serviceLookup && appointment.service_name) {
      const names = appointment.service_name.split(',').map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        const info = serviceLookup.get(name);
        if (info?.category) return info.category;
      }
    }

    // 3. Fall back to stored value (getCategoryColor heuristics will handle it)
    if (stored) return stored;

    // 4. Last resort: use service_name itself so heuristic matching can try
    return appointment.service_name || null;
  }, [appointment.service_category, appointment.service_name, serviceLookup, categoryColors]);

  const catColor = getCategoryColor(resolvedCategory, categoryColors);
  const useCategoryColor = colorBy === 'service' || appointment.status === 'booked' || appointment.status === 'unconfirmed';
  const isConsultation = isConsultationCategory(resolvedCategory);

  const storedColorHex = categoryColors[resolvedCategory?.toLowerCase() || '']?.bg || '';
  const gradientFromMarker = isGradientMarker(storedColorHex) ? getGradientFromMarker(storedColorHex) : null;
  const displayGradient = gradientFromMarker || (isConsultation ? DEFAULT_CONSULTATION_GRADIENT : null);

  const duration = parseTimeToMinutes(appointment.end_time) - parseTimeToMinutes(appointment.start_time);
  const isCompact = size === 'compact';

  const darkStyle = useMemo(() => {
    if (!isDark || !useCategoryColor || displayGradient) return null;
    return getDarkCategoryStyle(catColor.bg);
  }, [isDark, useCategoryColor, displayGradient, catColor.bg]);

  const serviceBands = useServiceBands(
    appointment, useCategoryColor, serviceLookup, categoryColors, displayGradient, isCompact
  );

  const indicatorFlags = getIndicatorFlags(appointment, isAssisting, hasAssistants);

  const isNoShow = appointment.status === 'no_show';
  const isCancelled = appointment.status === 'cancelled';

  const cardStyle = useMemo(() => {
    if (variant === 'agenda') return {};
    if (displayGradient) {
      return {
        background: displayGradient.background,
        color: displayGradient.textColor,
      };
    }
    if (useCategoryColor && isDark && darkStyle) {
      return {
        backgroundColor: darkStyle.fill,
        color: darkStyle.text,
        borderColor: darkStyle.fill,
        borderWidth: '1px',
        borderStyle: 'solid' as const,
        borderLeftColor: darkStyle.accent,
        borderLeftWidth: '4px',
        transition: 'background-color 150ms ease, box-shadow 150ms ease',
      };
    }
    if (useCategoryColor) {
      const boostedBg = boostPaleCategoryColor(catColor.bg);
      const boostedText = boostedBg !== catColor.bg ? getContrastingTextColor(boostedBg) : catColor.text;
      const lightTokens = deriveLightModeColor(boostedBg);
      return {
        backgroundColor: boostedBg,
        color: boostedText,
        borderColor: lightTokens.stroke,
        borderWidth: '1px',
        borderStyle: 'solid' as const,
        borderLeftColor: lightTokens.stroke,
        borderLeftWidth: '4px',
        boxShadow: 'none',
        opacity: 1,
        backdropFilter: 'none',
      };
    }
    return {};
  }, [variant, displayGradient, useCategoryColor, isDark, darkStyle, catColor, isCompact]);

  // ─── Agenda variant ─────────────────────────────────────────
  if (variant === 'agenda') {
    return (
      <AgendaContent
        appointment={appointment}
        indicatorFlags={indicatorFlags}
        serviceLookup={serviceLookup}
        assistantNamesMap={assistantNamesMap}
        hasAssistants={hasAssistants}
        onClick={onClick}
      />
    );
  }

  const gridContent = (
    <div
      className={cn(
        'h-full w-full rounded-lg cursor-pointer transition-all duration-200 ease-out overflow-hidden group',
        'hover:shadow-md hover:z-20 hover:brightness-[1.08]',
        !displayGradient && 'border-l-4',
        !useCategoryColor && !displayGradient && statusColors.bg,
        !useCategoryColor && !displayGradient && statusColors.border,
        !useCategoryColor && !displayGradient && statusColors.text,
        isCancelled && 'opacity-60',
        isNoShow && 'ring-2 ring-destructive ring-inset',
        isSelected && 'ring-2 ring-primary/60 ring-offset-1',
        displayGradient && 'shadow-lg',
        appointment.status === 'pending' && (appointment as any).is_redo && 'border-dashed border-2 border-amber-500 dark:border-amber-400',
      )}
      style={cardStyle}
      onClick={onClick}
    >
      <CardOverlays
        appointment={appointment}
        displayGradient={displayGradient}
        useCategoryColor={useCategoryColor}
        catColor={catColor}
      />

      {/* Multi-service color bands */}
      {serviceBands && useCategoryColor && (
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-lg">
          {serviceBands.map((band, i) => {
            const bandDark = isDark ? getDarkCategoryStyle(band.color.bg) : null;
            return (
              <div
                key={i}
                className="relative overflow-hidden"
                style={{
                  flex: `${band.percent} 0 0%`,
                  backgroundColor: bandDark ? bandDark.fill : band.color.bg,
                }}
              >
                {size === 'full' && duration >= 120 && (
                  <span
                    className="absolute bottom-0 right-1 text-[9px] opacity-70 truncate max-w-[90%] text-right"
                    style={{ textShadow: '0 0 3px rgba(0,0,0,0.15)' }}
                  >
                    {band.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <GridContent
        appointment={appointment}
        size={size}
        indicatorFlags={indicatorFlags}
        serviceLookup={serviceLookup}
        assistantNamesMap={assistantNamesMap}
        assistantProfilesMap={assistantProfilesMap}
        serviceBands={serviceBands}
        duration={duration}
        showStylistBadge={showStylistBadge}
        showClientPhone={showClientPhone}
        showClientAvatar={showClientAvatar}
      />
    </div>
  );

  return gridContent;
}

// ─── Helper to compute card size from duration ────────────────
export function getCardSize(startTime: string, endTime: string, zoomLevel: number = 0): CardSize {
  const duration = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
  // Level 3 (5-min): huge pixel density per minute
  if (zoomLevel === 3) {
    if (duration <= 5) return 'compact';
    if (duration <= 15) return 'medium';
    return 'full';
  }
  if (zoomLevel === 2) {
    if (duration <= 15) return 'medium';
    return 'full';
  }
  if (zoomLevel === 1) {
    if (duration <= 15) return 'compact';
    if (duration <= 30) return 'medium';
    return 'full';
  }
  // Negative levels: compressed rows, appointments span many slots
  if (zoomLevel < 0) {
    if (duration <= 45) return 'compact';
    if (duration <= 90) return 'medium';
    return 'full';
  }
  // Default (level 0)
  if (duration <= 30) return 'compact';
  if (duration <= 59) return 'medium';
  return 'full';
}
