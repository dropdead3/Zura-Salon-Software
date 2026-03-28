import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StylistData {
  user_id: string;
  name: string;
  totalRevenue: number;
  totalServices: number;
  [key: string]: any;
}

interface RevPerHourByStylistPanelProps {
  isOpen: boolean;
  stylistData: StylistData[] | undefined;
  totalServiceHours: number;
  isLoading: boolean;
}

const PAGE_SIZE = 30;

export function RevPerHourByStylistPanel({ isOpen, stylistData, totalServiceHours, isLoading }: RevPerHourByStylistPanelProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [page, setPage] = useState(0);

  const { stylists, salonAvg, maxRevPerHour } = useMemo(() => {
    if (!stylistData || stylistData.length === 0 || totalServiceHours === 0) {
      return { stylists: [], salonAvg: 0, maxRevPerHour: 0 };
    }

    const totalRev = stylistData.reduce((s, st) => s + st.totalRevenue, 0);
    const avg = totalRev / totalServiceHours;

    const totalServices = stylistData.reduce((s, st) => s + st.totalServices, 0);
    
    const mapped = stylistData
      .filter(st => st.totalServices > 0)
      .map(st => {
        const stylistHours = totalServices > 0 
          ? (st.totalServices / totalServices) * totalServiceHours
          : 0;
        const revPerHour = stylistHours > 0 ? st.totalRevenue / stylistHours : 0;
        return {
          ...st,
          revPerHour,
          estimatedHours: stylistHours,
          aboveAvg: revPerHour >= avg,
        };
      })
      .sort((a, b) => b.revPerHour - a.revPerHour);

    return {
      stylists: mapped,
      salonAvg: avg,
      maxRevPerHour: mapped.length > 0 ? mapped[0].revPerHour : 0,
    };
  }, [stylistData, totalServiceHours]);

  // Reset page when data changes
  useMemo(() => { setPage(0); }, [stylistData, totalServiceHours]);

  const hasData = stylists.length > 0;
  const totalPages = Math.ceil(stylists.length / PAGE_SIZE);
  const isPaginated = stylists.length > PAGE_SIZE;
  const pageItems = isPaginated ? stylists.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : stylists;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="rev-per-hour-stylist"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-3 pb-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-display text-xs tracking-wide uppercase text-muted-foreground">
                  Efficiency by Stylist
                </span>
              </div>
              {hasData && (
                <span className="text-xs text-muted-foreground">
                  Salon avg: <BlurredAmount><span className="font-medium text-foreground">{formatCurrencyWhole(Math.round(salonAvg))}/hr</span></BlurredAmount>
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : !hasData ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No stylist data for this period</p>
            ) : (
              <>
                <div className="space-y-1">
                  {pageItems.map((stylist, idx) => {
                    const pct = maxRevPerHour > 0 ? (stylist.revPerHour / maxRevPerHour) * 100 : 0;
                    return (
                      <motion.div
                        key={stylist.user_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={cn(
                          "grid grid-cols-[120px_1fr_100px] items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors",
                          idx % 2 === 0 && "bg-muted/15"
                        )}
                      >
                        <span className="text-sm text-foreground font-medium truncate">
                          {stylist.name}
                        </span>
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden relative">
                          {maxRevPerHour > 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-foreground/30 z-10"
                              style={{ left: `${(salonAvg / maxRevPerHour) * 100}%` }}
                            />
                          )}
                          <motion.div
                            className={cn(
                              "h-full rounded-full",
                              stylist.aboveAvg ? "bg-primary/70" : "bg-muted-foreground/40"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.02, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-sm font-display tabular-nums text-right">
                          <BlurredAmount>{formatCurrencyWhole(Math.round(stylist.revPerHour))}/hr</BlurredAmount>
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {isPaginated && (
                  <div className="flex items-center justify-center gap-3 pt-2 pb-1">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-1 rounded-md hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-1 rounded-md hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
