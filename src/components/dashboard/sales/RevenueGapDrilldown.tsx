import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

import { Skeleton } from '@/components/ui/skeleton';
import { Ban, UserX, AlertTriangle, Tag, ArrowRight, Shuffle, HelpCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { RevenueGapAnalysis, GapItem, GapReason } from '@/hooks/useRevenueGapAnalysis';

interface RevenueGapDrilldownProps {
  isOpen: boolean;
  data: RevenueGapAnalysis | undefined;
  isLoading: boolean;
  showDates?: boolean;
}

const INITIAL_VISIBLE = 7;

const REASON_CONFIG: Record<GapReason, {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
}> = {
  not_concluded: {
    label: 'In progress',
    icon: Clock,
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    badgeClass: 'bg-destructive/10 text-destructive/80 border-destructive/20',
  },
  no_show: {
    label: 'No-show',
    icon: UserX,
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  no_pos_record: {
    label: 'No POS record',
    icon: AlertTriangle,
    badgeClass: 'bg-destructive/10 text-destructive/70 border-destructive/15',
  },
  discount: {
    label: 'Discount',
    icon: Tag,
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  service_changed: {
    label: 'Service changed',
    icon: Shuffle,
    badgeClass: 'bg-primary/10 text-primary/80 border-primary/20',
  },
  pricing_diff: {
    label: 'Pricing diff',
    icon: HelpCircle,
    badgeClass: 'bg-muted text-muted-foreground border-border/40',
  },
};

/** Status-specific overrides for not_concluded items */
const STATUS_BADGE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  booked: { label: 'Booked', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  confirmed: { label: 'Confirmed', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  pending: { label: 'Unconfirmed', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  arrived: { label: 'Arrived', badgeClass: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  started: { label: 'In progress', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

function GapItemRow({ item, showDates, formatCurrency }: {
  item: GapItem;
  showDates: boolean;
  formatCurrency: (v: number) => string;
}) {
  const config = REASON_CONFIG[item.reason];
  const Icon = config.icon;
  // For not_concluded items, use the actual appointment status for badge label/color
  const statusOverride = item.reason === 'not_concluded' && item.status
    ? STATUS_BADGE_CONFIG[item.status]
    : null;
  const badgeLabel = statusOverride?.label ?? config.label;
  const badgeClass = statusOverride?.badgeClass ?? config.badgeClass;
  const showAmountShift = item.reason !== 'cancelled' && item.reason !== 'no_show' && item.actualAmount > 0;

  return (
    <div className="flex flex-col gap-2 text-xs py-3 px-3.5 rounded-lg bg-muted/40 border border-border/30 overflow-hidden">
      {/* Row 1: Badge + client name */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border shrink-0",
            badgeClass
          )}>
            <Icon className="w-3 h-3" />
            {badgeLabel}
          </span>
          <span className="font-sans text-foreground font-medium truncate min-w-0">{item.clientName}</span>
        </div>
        {item.reason === 'not_concluded' ? (
          <BlurredAmount>
            <span className="font-sans text-sm text-emerald-500/80 whitespace-nowrap shrink-0 tabular-nums">
              {formatCurrency(item.variance)} expected
            </span>
          </BlurredAmount>
        ) : (
          <BlurredAmount>
            <span className="font-sans text-sm text-destructive/90 whitespace-nowrap shrink-0 tabular-nums">
              -{formatCurrency(item.variance)}
            </span>
          </BlurredAmount>
        )}
      </div>

      {/* Row 2: Service · stylist */}
      <div className="flex flex-col gap-1 pl-0.5 min-w-0 text-muted-foreground text-[11px] text-left">
        <span className="whitespace-normal break-words leading-relaxed pr-2">
          {[
            item.serviceName,
            item.stylistName ? `w/ ${item.stylistName}` : null,
            showDates ? item.appointmentDate : null,
          ].filter(Boolean).join(' · ')}
        </span>
        {showAmountShift && (
          <span className="flex items-center gap-1 shrink-0 self-end text-[11px]">
            <BlurredAmount><span>{formatCurrency(item.scheduledAmount)}</span></BlurredAmount>
            <ArrowRight className="w-3 h-3" />
            <BlurredAmount><span>{formatCurrency(item.actualAmount)}</span></BlurredAmount>
          </span>
        )}
      </div>
    </div>
  );
}

export function RevenueGapDrilldown({ isOpen, data, isLoading, showDates = false }: RevenueGapDrilldownProps) {
  const { formatCurrency } = useFormatCurrency();
  const [showAll, setShowAll] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="mt-4 mx-auto max-w-sm space-y-4 border-t border-border/40 pt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : data ? (
              <>
                {/* Summary context */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Scheduled Service Revenue</span>
                    <BlurredAmount>
                      <span className="font-medium text-foreground">
                        {formatCurrency(data.expectedRevenue)}
                      </span>
                    </BlurredAmount>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Gap Revenue</span>
                    <BlurredAmount>
                      <span className={cn(
                        "font-medium",
                        data.gapAmount <= 0 ? "text-success-foreground" : "text-warning"
                      )}>
                        {data.gapAmount <= 0 ? '+' : '-'}{formatCurrency(Math.abs(data.gapAmount))}
                      </span>
                    </BlurredAmount>
                  </div>
                </div>

                {/* Unified gap item list */}
                {data.gapAmount > 0 && data.gapItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-display tracking-wide text-muted-foreground">
                      Service Revenue Gap Breakdown
                    </p>

                    <ScrollArea className={cn(showAll && data.gapItems.length > 7 ? 'h-[350px]' : '')}>
                      <div className="space-y-1">
                        {(showAll ? data.gapItems : data.gapItems.slice(0, INITIAL_VISIBLE)).map((item) => (
                          <GapItemRow
                            key={item.id + item.reason}
                            item={item}
                            showDates={showDates}
                            formatCurrency={formatCurrency}
                          />
                        ))}
                      </div>
                    </ScrollArea>

                    {data.gapItems.length > INITIAL_VISIBLE && !showAll && (
                      <button
                        onClick={() => setShowAll(true)}
                        className="w-full text-[11px] text-primary/80 hover:text-primary py-1.5 transition-colors"
                      >
                        Show all {data.gapItems.length} items
                      </button>
                    )}

                    {/* Summary by category */}
                    {data.summaries.length > 1 && (
                      <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
                        {data.summaries.map(s => (
                          <div key={s.reason} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {s.label} ({s.count})
                            </span>
                            <BlurredAmount>
                              <span className="text-muted-foreground">
                                -{formatCurrency(s.totalVariance)}
                              </span>
                            </BlurredAmount>
                          </div>
                        ))}
                        {data.unexplainedGap > 0 && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Other / rounding</span>
                            <BlurredAmount>
                              <span className="text-muted-foreground">
                                -{formatCurrency(data.unexplainedGap)}
                              </span>
                            </BlurredAmount>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {data.gapAmount <= 0 && (
                  <p className="text-xs text-success-foreground/80 text-center">
                    Actual revenue met or exceeded expectations for this period.
                  </p>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
