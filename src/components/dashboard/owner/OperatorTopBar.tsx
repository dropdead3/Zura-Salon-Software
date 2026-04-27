import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserMinus, Sparkles, Crown, AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useTodayAtAGlance } from '@/hooks/useTodayAtAGlance';

/**
 * OperatorTopBar — persistent slim top-bar (Operator Mode).
 *
 * Owner-only "Today at a Glance" surface that follows scroll. Hidden until
 * the user scrolls past the hero (keeps the briefing area un-crowded), then
 * pinned to the top of the dashboard scroll container.
 *
 * Visibility-contract compliant: when the day has no signal at all
 * (`hasSignal === false`), the bar is suppressed entirely. Silence is valid
 * output.
 *
 * Layout: 5 KPI tiles + scope label, single row, container-aware
 * (compresses on narrow widths via flex-wrap).
 */
interface OperatorTopBarProps {
  /** Hard gate: only render for account owners. */
  enabled: boolean;
  /** Active location filter; undefined = aggregate across accessibleLocationIds. */
  locationId?: string;
  accessibleLocationIds: string[];
  /** Human label for the scope (e.g. "All Locations" or location name). */
  scopeLabel: string;
  /** Pixels of scroll before the bar reveals. Default 120. */
  revealAfterPx?: number;
}

export function OperatorTopBar({
  enabled,
  locationId,
  accessibleLocationIds,
  scopeLabel,
  revealAfterPx = 120,
}: OperatorTopBarProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => setRevealed(window.scrollY > revealAfterPx);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, revealAfterPx]);

  const data = useTodayAtAGlance({ enabled, locationId, accessibleLocationIds });

  if (!enabled) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[visibility-contract] suppressed surface="operator-top-bar" reason="not-account-owner"');
    }
    return null;
  }

  if (!data.isLoading && !data.hasSignal) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[visibility-contract] suppressed surface="operator-top-bar" reason="empty-day"');
    }
    return null;
  }

  return (
    <AnimatePresence>
      {revealed && (
        <motion.div
          key="operator-top-bar"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'fixed top-0 left-0 right-0 z-40',
            'bg-card/85 backdrop-blur-xl border-b border-border',
            'shadow-[0_2px_24px_-12px_rgba(0,0,0,0.25)]',
          )}
          role="region"
          aria-label="Today at a glance"
        >
          <div className="mx-auto max-w-[1600px] px-4 lg:px-8 h-14 flex items-center gap-2 lg:gap-4 overflow-x-auto">
            {/* Scope label — anchors the whole bar to a location */}
            <div className="flex items-center gap-1.5 shrink-0 pr-2 lg:pr-3 border-r border-border">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={cn('text-[10px] tracking-wider uppercase', tokens.label.tiny)}>
                Today
              </span>
              <span className="text-xs font-sans text-foreground truncate max-w-[140px]">
                {scopeLabel || 'Org'}
              </span>
            </div>

            {/* KPI tiles */}
            <OperatorKpi
              icon={Users}
              label="On"
              value={data.staffOnToday}
              tone="default"
            />
            {data.staffCalledOut > 0 && (
              <OperatorKpi
                icon={UserMinus}
                label="Out"
                value={data.staffCalledOut}
                tone="warn"
              />
            )}
            {data.firstTimersToday > 0 && (
              <OperatorKpi
                icon={Sparkles}
                label="New"
                value={data.firstTimersToday}
                tone="positive"
              />
            )}
            {data.vipsToday > 0 && (
              <OperatorKpi
                icon={Crown}
                label="VIP"
                value={data.vipsToday}
                tone="positive"
              />
            )}
            {data.doubleBookings > 0 && (
              <OperatorKpi
                icon={AlertTriangle}
                label="Conflicts"
                value={data.doubleBookings}
                tone="critical"
              />
            )}

            {/* Total appointments — right aligned, secondary */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-2 lg:pl-3 border-l border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                Booked
              </span>
              <span className="text-sm font-sans font-medium text-foreground">
                {data.totalAppointments}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface OperatorKpiProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'default' | 'positive' | 'warn' | 'critical';
}

function OperatorKpi({ icon: Icon, label, value, tone }: OperatorKpiProps) {
  const toneClass = {
    default: 'text-foreground',
    positive: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    critical: 'text-destructive',
  }[tone];

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Icon className={cn('w-3.5 h-3.5', toneClass)} />
      <span className={cn('text-[10px] uppercase tracking-wider font-display', toneClass)}>
        {label}
      </span>
      <span className={cn('text-sm font-sans font-medium tabular-nums', toneClass)}>
        {value}
      </span>
    </div>
  );
}
