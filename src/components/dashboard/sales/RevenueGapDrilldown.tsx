import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Ban, UserX, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { RevenueGapAnalysis, GapAppointment } from '@/hooks/useRevenueGapAnalysis';

interface RevenueGapDrilldownProps {
  isOpen: boolean;
  data: RevenueGapAnalysis | undefined;
  isLoading: boolean;
  /** If true, show date column in appointment rows (multi-day ranges) */
  showDates?: boolean;
}

const INITIAL_VISIBLE = 5;

function AppointmentList({
  appointments,
  showDates,
  formatCurrency,
}: {
  appointments: GapAppointment[];
  showDates: boolean;
  formatCurrency: (v: number) => string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? appointments : appointments.slice(0, INITIAL_VISIBLE);
  const hasMore = appointments.length > INITIAL_VISIBLE;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="mt-1.5 space-y-1 pl-5">
        {visible.map((appt) => (
          <div
            key={appt.id}
            className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-md bg-muted/40 border border-border/20"
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-2">
              <span className="font-sans text-foreground truncate">
                {appt.clientName || 'Walk-in'}
              </span>
              <span className="text-muted-foreground truncate">
                {[
                  appt.serviceName,
                  appt.stylistName ? `w/ ${appt.stylistName}` : null,
                  showDates ? appt.appointmentDate : null,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
            <BlurredAmount>
              <span className="font-sans text-destructive/80 whitespace-nowrap">
                -{formatCurrency(appt.totalPrice)}
              </span>
            </BlurredAmount>
          </div>
        ))}
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-[11px] text-primary/80 hover:text-primary py-1 transition-colors"
          >
            Show all {appointments.length} appointments
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ExpandableRow({
  icon,
  iconClass,
  label,
  amount,
  amountClass,
  appointments,
  showDates,
  formatCurrency,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  label: string;
  amount: number;
  amountClass: string;
  appointments: GapAppointment[];
  showDates: boolean;
  formatCurrency: (v: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = appointments.length > 0;

  return (
    <div>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
        className={cn(
          "flex items-center justify-between text-xs w-full bg-card-inner rounded-lg px-3 py-2 border border-border/30 transition-colors",
          hasDetails && "cursor-pointer hover:bg-muted/60"
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-muted-foreground">{label}</span>
          {hasDetails && (
            <ChevronDown className={cn(
              "w-3 h-3 text-muted-foreground/60 transition-transform duration-200",
              expanded && "rotate-180"
            )} />
          )}
        </div>
        <BlurredAmount>
          <span className={cn("font-medium", amountClass)}>
            -{formatCurrency(amount)}
          </span>
        </BlurredAmount>
      </button>
      <AnimatePresence>
        {expanded && (
          <AppointmentList
            appointments={appointments}
            showDates={showDates}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function RevenueGapDrilldown({ isOpen, data, isLoading, showDates = false }: RevenueGapDrilldownProps) {
  const { formatCurrency } = useFormatCurrency();

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
                {/* Summary bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Actual vs Expected</span>
                    <BlurredAmount>
                      <span className={cn(
                        "font-medium",
                        data.gapAmount <= 0 ? "text-success-foreground" : "text-warning"
                      )}>
                        {data.gapAmount <= 0 ? '+' : '-'}{formatCurrency(Math.abs(data.gapAmount))}
                      </span>
                    </BlurredAmount>
                  </div>
                  <Progress
                    value={data.expectedRevenue > 0
                      ? Math.min((data.actualRevenue / data.expectedRevenue) * 100, 100)
                      : 0
                    }
                    className="h-1.5"
                    indicatorClassName={data.gapAmount <= 0 ? "bg-success-foreground" : undefined}
                  />
                </div>

                {/* Gap breakdown */}
                {data.gapAmount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-display tracking-wide text-muted-foreground">GAP BREAKDOWN</p>

                    {data.cancellations.count > 0 && (
                      <ExpandableRow
                        icon={<Ban className="w-3.5 h-3.5 text-destructive/70" />}
                        label={`${data.cancellations.count} cancellation${data.cancellations.count !== 1 ? 's' : ''}`}
                        amount={data.cancellations.lostRevenue}
                        amountClass="text-destructive/80"
                        appointments={data.cancellations.appointments}
                        showDates={showDates}
                        formatCurrency={formatCurrency}
                      />
                    )}

                    {data.noShows.count > 0 && (
                      <ExpandableRow
                        icon={<UserX className="w-3.5 h-3.5 text-warning" />}
                        label={`${data.noShows.count} no-show${data.noShows.count !== 1 ? 's' : ''}`}
                        amount={data.noShows.lostRevenue}
                        amountClass="text-warning"
                        appointments={data.noShows.appointments}
                        showDates={showDates}
                        formatCurrency={formatCurrency}
                      />
                    )}

                    {data.unexplainedGap > 0 && (
                      <div className="flex items-center justify-between text-xs bg-card-inner rounded-lg px-3 py-2 border border-border/30">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Pricing / discounts / other</span>
                        </div>
                        <BlurredAmount>
                          <span className="font-medium text-muted-foreground">
                            -{formatCurrency(data.unexplainedGap)}
                          </span>
                        </BlurredAmount>
                      </div>
                    )}
                  </div>
                )}

                {/* Insight text */}
                {data.gapAmount > 0 && (data.cancellations.count > 0 || data.noShows.count > 0) && (
                  <p className="text-xs text-muted-foreground/80 text-center leading-relaxed">
                    {(() => {
                      const totalExplained = data.cancellations.lostRevenue + data.noShows.lostRevenue;
                      if (totalExplained <= 0 || data.gapAmount <= 0) return null;
                      const pct = Math.round((data.cancellations.lostRevenue / data.gapAmount) * 100);
                      if (data.cancellations.lostRevenue > data.noShows.lostRevenue) {
                        return `Cancellations accounted for ${pct}% of the revenue gap this period.`;
                      }
                      const noShowPct = Math.round((data.noShows.lostRevenue / data.gapAmount) * 100);
                      return `No-shows accounted for ${noShowPct}% of the revenue gap this period.`;
                    })()}
                  </p>
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
