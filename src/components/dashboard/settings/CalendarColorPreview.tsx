import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Coffee, Moon } from 'lucide-react';
import {
  getCategoryColor,
  SPECIAL_GRADIENTS,
  isGradientMarker,
  getGradientFromMarker,
  getDarkCategoryStyle,
  boostPaleCategoryColor,
  getContrastingTextColor,
  deriveLightModeColor,
} from '@/utils/categoryColors';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { getEventStyle, parseTimeToMinutes, formatTime12h } from '@/lib/schedule-utils';

interface CalendarColorPreviewProps {
  colorMap: Record<string, { bg: string; text: string; abbr: string }>;
}

// ─── Sample data — 4-day Mon–Thu window, 9a–5p ─────────────────
interface SampleAppt {
  day: number;
  start: string;
  end: string;
  category: string;
  client: string;
  isNewClient?: boolean;
  status?: keyof typeof APPOINTMENT_STATUS_BADGE;
}

const SAMPLE_APPOINTMENTS: SampleAppt[] = [
  // Monday
  { day: 0, start: '09:00', end: '11:00', category: 'Blonding', client: 'Sarah M.', status: 'confirmed' },
  { day: 0, start: '11:30', end: '12:30', category: 'Haircut', client: 'Emma T.', status: 'booked' },
  { day: 0, start: '12:30', end: '13:00', category: 'Break', client: 'Lunch' },
  { day: 0, start: '14:00', end: '16:30', category: 'Extensions', client: 'Olivia K.', status: 'booked' },

  // Tuesday
  { day: 1, start: '09:00', end: '09:30', category: 'New Client Consultation', client: 'New Guest', isNewClient: true, status: 'confirmed' },
  { day: 1, start: '10:00', end: '11:00', category: 'Color', client: 'Ava R.', status: 'booked' },
  { day: 1, start: '11:30', end: '12:30', category: 'Extras', client: 'Mia L.', status: 'booked' },
  { day: 1, start: '13:30', end: '15:30', category: 'Blonding', client: 'Lily W.', status: 'booked' },
  { day: 1, start: '16:00', end: '17:00', category: 'Styling', client: 'Chloe B.', status: 'booked' },

  // Wednesday (today)
  { day: 2, start: '09:00', end: '10:00', category: 'Haircut', client: 'Grace H.', status: 'booked' },
  { day: 2, start: '10:30', end: '13:00', category: 'Extensions', client: 'Zoe P.', status: 'booked' },
  { day: 2, start: '14:00', end: '15:00', category: 'Color', client: 'Ella N.', status: 'booked' },
  { day: 2, start: '15:30', end: '17:00', category: 'Extras', client: 'Aria S.', status: 'booked' },

  // Thursday
  { day: 3, start: '09:00', end: '10:30', category: 'Block', client: 'Admin Time' },
  { day: 3, start: '11:00', end: '13:30', category: 'Blonding', client: 'Nora J.', status: 'booked' },
  { day: 3, start: '14:00', end: '15:00', category: 'Haircut', client: 'Ivy M.', status: 'booked' },
  { day: 3, start: '15:30', end: '17:00', category: 'Color', client: 'Stella V.', status: 'booked' },
];

const HOURS_START = 9;
const HOURS_END = 17;
const SLOT_INTERVAL = 15;
const ROW_HEIGHT = 14;
const TOTAL_SLOTS = ((HOURS_END - HOURS_START) * 60) / SLOT_INTERVAL;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu'];
const DAY_NUMBERS = [20, 21, 22, 23];
const TODAY_INDEX = 2; // Wed
const BLOCKED_CATEGORIES = ['Block', 'Break'];

// Time labels — only the on-the-hour rows render a label
const TIME_SLOTS = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
  const totalMins = HOURS_START * 60 + i * SLOT_INTERVAL;
  const hour = Math.floor(totalMins / 60);
  const minute = totalMins % 60;
  const isHour = minute === 0;
  let label = '';
  if (isHour) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    label = `${hour12} ${ampm}`;
  }
  return { hour, minute, isHour, label };
});

const isConsultationCategory = (category: string) => category.toLowerCase().includes('consult');
const DEFAULT_CONSULTATION_GRADIENT = SPECIAL_GRADIENTS['teal-lime'];

// Block / Break treatment — mirrors BLOCK_TYPE_CONFIG in BreakBlockOverlay.tsx
const BLOCK_CONFIG: Record<string, { icon: typeof Coffee; bg: string; border: string; text: string }> = {
  Break: {
    icon: Coffee,
    bg: 'bg-amber-500/20',
    border: 'border-l-amber-500',
    text: 'text-amber-900 dark:text-amber-200',
  },
  Block: {
    icon: Moon,
    bg: 'bg-muted/40',
    border: 'border-l-muted-foreground/30',
    text: 'text-muted-foreground',
  },
};

export function CalendarColorPreview({ colorMap }: CalendarColorPreviewProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isDark = resolvedTheme === 'dark';

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<number, SampleAppt[]> = { 0: [], 1: [], 2: [], 3: [] };
    SAMPLE_APPOINTMENTS.forEach((apt) => grouped[apt.day].push(apt));
    return grouped;
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ─── Frosted Day Header ─────────────────────────────────── */}
      <div
        className="grid border-b border-border/50 sticky top-0 z-10"
        style={{
          gridTemplateColumns: '70px repeat(4, 1fr)',
          background: 'hsl(var(--muted) / 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="p-2" />
        {DAYS.map((day, index) => {
          const isToday = index === TODAY_INDEX;
          const apptCount = appointmentsByDay[index]?.length || 0;
          return (
            <div
              key={day}
              className={cn(
                'py-2 px-2 text-center border-l border-border/50',
                isToday && 'bg-primary/10',
              )}
            >
              <div
                className={cn(
                  'text-[10px] font-display uppercase tracking-wider font-medium',
                  isToday ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {day}
                {isToday ? ' · Today' : ''}
              </div>
              <div className="flex items-center justify-center mt-0.5">
                <span
                  className={cn(
                    'text-base font-medium flex items-center justify-center transition-colors',
                    isToday
                      ? 'bg-foreground text-background min-w-[28px] h-7 px-2 rounded-full'
                      : 'text-foreground',
                  )}
                >
                  {DAY_NUMBERS[index]}
                </span>
              </div>
              <div
                className={cn(
                  'text-[10px] mt-0.5',
                  isToday ? 'text-primary font-medium' : 'text-muted-foreground',
                )}
              >
                {isToday ? 'Today' : `${apptCount} appts`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Time Grid ──────────────────────────────────────────── */}
      <div className="grid relative" style={{ gridTemplateColumns: '70px repeat(4, 1fr)' }}>
        {/* Time gutter */}
        <div className="relative bg-sidebar">
          {TIME_SLOTS.map((slot, i) => (
            <div
              key={i}
              className={cn(
                'text-xs text-muted-foreground pr-2 text-right flex items-center justify-end',
                slot.isHour && 'font-medium',
              )}
              style={{ height: ROW_HEIGHT }}
            >
              {slot.label && (
                <span className={slot.isHour ? 'text-foreground' : 'text-muted-foreground/60'}>
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((_, dayIndex) => {
          const isToday = dayIndex === TODAY_INDEX;
          return (
            <div
              key={dayIndex}
              className={cn('relative border-l border-border', isToday && 'bg-primary/5')}
            >
              {/* Slot rows — light hairline every slot, darker on the hour */}
              {TIME_SLOTS.map((slot, i) => (
                <div
                  key={i}
                  className={cn(
                    'border-b',
                    slot.isHour ? 'border-border' : 'border-border/30',
                  )}
                  style={{ height: ROW_HEIGHT }}
                />
              ))}

              {/* Appointments */}
              {appointmentsByDay[dayIndex]?.map((apt, aptIndex) => {
                const eventStyle = getEventStyle(
                  apt.start,
                  apt.end,
                  HOURS_START,
                  ROW_HEIGHT,
                  SLOT_INTERVAL,
                );
                const pixelHeight = parseInt(eventStyle.height);
                const isShort = pixelHeight < 28;
                const isMedium = pixelHeight >= 28 && pixelHeight < 55;

                // Block / Break — render via BlockOverlay treatment
                if (BLOCKED_CATEGORIES.includes(apt.category)) {
                  const cfg = BLOCK_CONFIG[apt.category];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={aptIndex}
                      className={cn(
                        'absolute left-0 right-0 z-[3] mx-0.5 rounded-lg border-l-4 overflow-hidden',
                        cfg.bg,
                        cfg.border,
                        cfg.text,
                      )}
                      style={eventStyle}
                    >
                      {isShort && (
                        <div className="flex items-center justify-center h-full">
                          <Icon className="h-3 w-3 shrink-0 opacity-70" />
                        </div>
                      )}
                      {isMedium && (
                        <div className="flex items-center gap-1 px-1.5 mt-0.5">
                          <Icon className="h-3 w-3 shrink-0 opacity-70" />
                          <span className="text-[10px] font-medium truncate">{apt.client}</span>
                        </div>
                      )}
                      {!isShort && !isMedium && (
                        <div className="flex flex-col gap-0.5 px-1.5 py-1">
                          <div className="flex items-center gap-1">
                            <Icon className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="text-[10px] font-medium truncate">{apt.client}</span>
                          </div>
                          <span className="text-[9px] opacity-60 truncate pl-4">
                            {formatTime12h(apt.start)} – {formatTime12h(apt.end)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                // Resolve color via the schedule's exact pipeline
                const catColor = getCategoryColor(apt.category, colorMap);
                const isConsult = isConsultationCategory(apt.category);
                const storedHex = colorMap[apt.category.toLowerCase()]?.bg || '';
                const gradientFromMarker = isGradientMarker(storedHex)
                  ? getGradientFromMarker(storedHex)
                  : null;
                const displayGradient =
                  gradientFromMarker || (isConsult ? DEFAULT_CONSULTATION_GRADIENT : null);

                // Theme-aware card styling
                let cardStyle: React.CSSProperties = {};
                if (displayGradient) {
                  cardStyle = {
                    ...eventStyle,
                    background: displayGradient.background,
                    color: displayGradient.textColor,
                  };
                } else if (isDark) {
                  const ds = getDarkCategoryStyle(catColor.bg);
                  cardStyle = {
                    ...eventStyle,
                    backgroundColor: ds.fill,
                    color: ds.text,
                    borderColor: ds.fill,
                    borderLeftColor: ds.accent,
                  };
                } else {
                  const boostedBg = boostPaleCategoryColor(catColor.bg);
                  const boostedText =
                    boostedBg !== catColor.bg ? getContrastingTextColor(boostedBg) : catColor.text;
                  const lightTokens = deriveLightModeColor(boostedBg);
                  cardStyle = {
                    ...eventStyle,
                    backgroundColor: boostedBg,
                    color: boostedText,
                    borderColor: lightTokens.stroke,
                    borderLeftColor: lightTokens.stroke,
                  };
                }

                const badge = apt.status
                  ? APPOINTMENT_STATUS_BADGE[apt.status]
                  : APPOINTMENT_STATUS_BADGE.booked;

                return (
                  <div
                    key={aptIndex}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded-lg overflow-hidden transition-all duration-200',
                      'shadow-sm hover:shadow-md hover:brightness-[1.08]',
                      !displayGradient && 'border border-l-4',
                      displayGradient && 'shadow-lg',
                    )}
                    style={cardStyle}
                  >
                    {/* Glass stroke + shimmer for gradient categories */}
                    {displayGradient && (
                      <>
                        <div
                          className="absolute inset-0 rounded-lg pointer-events-none"
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
                            background:
                              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      </>
                    )}

                    {/* Content */}
                    <div className="px-1.5 py-1 relative z-10 h-full flex flex-col">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-medium truncate flex-1 min-w-0">
                          {apt.client}
                        </span>
                        {!isShort && apt.status && (
                          <span
                            className={cn(
                              'text-[8px] px-1 py-px rounded-full font-medium whitespace-nowrap border shrink-0',
                              badge.bg,
                              badge.text,
                              badge.border,
                            )}
                          >
                            {badge.shortLabel}
                          </span>
                        )}
                      </div>

                      {!isShort && !isMedium && (
                        <span className="text-[9px] opacity-80 truncate mt-0.5">
                          {apt.category}
                        </span>
                      )}

                      {/* NC/RC chip — bottom right for new client */}
                      {apt.isNewClient && pixelHeight >= 32 && (
                        <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          NC
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
