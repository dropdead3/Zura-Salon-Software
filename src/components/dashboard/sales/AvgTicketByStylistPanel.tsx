import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAvgTicketByStylist, type StylistTicketData, type StylistCategoryBreakdown } from '@/hooks/useAvgTicketByStylist';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';

const FALLBACK_COLOR = '#888888';

interface AvgTicketByStylistPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

const MAX_VISIBLE = 5;

/** Level 2: Service category breakdown for a stylist */
function ServiceMixPanel({ categories }: { categories: StylistCategoryBreakdown[] }) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { colorMap } = useServiceCategoryColorsMap();
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pl-6 border-l-2 border-primary/20 mt-2 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Layers className="w-3 h-3" />
          <span>Service Mix</span>
        </div>
        {categories.map((cat, i) => {
          const color = colorMap[cat.category.toLowerCase()]?.bg || FALLBACK_COLOR;
          return (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs flex-1 truncate">{cat.category}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{cat.count} appointment{cat.count !== 1 ? 's' : ''}</span>
              <span className="text-xs tabular-nums font-medium w-[50px] text-right">
                <BlurredAmount>{formatCurrencyWhole(Math.round(cat.revenue))}</BlurredAmount>
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground w-[30px] text-right">{cat.sharePercent}%</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/** Level 1: Stylist row with avg ticket and expandable service mix */
function StylistTicketRow({ stylist, delay, orgAvg }: { stylist: StylistTicketData; delay: number; orgAvg: number }) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [expanded, setExpanded] = useState(false);
  const diff = orgAvg > 0 ? Math.round(((stylist.avgTicket - orgAvg) / orgAvg) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <div
        className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <ZuraAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{stylist.staffName}</p>
          <p className="text-xs text-muted-foreground">
            {stylist.transactionCount} appointment{stylist.transactionCount !== 1 ? 's' : ''}
            {diff !== 0 && (
              <span className={cn('ml-1.5', diff > 0 ? 'text-chart-4' : 'text-destructive')}>
                {diff > 0 ? '+' : ''}{diff}% vs avg
              </span>
            )}
          </p>
        </div>
        <span className="text-sm font-display tabular-nums">
          <BlurredAmount>{formatCurrencyWhole(Math.round(stylist.avgTicket))}</BlurredAmount>
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </div>
      <AnimatePresence>
        {expanded && <ServiceMixPanel categories={stylist.categories} />}
      </AnimatePresence>
    </motion.div>
  );
}

export function AvgTicketByStylistPanel({ isOpen, dateFrom, dateTo, locationId }: AvgTicketByStylistPanelProps) {
  const { data, isLoading } = useAvgTicketByStylist({ dateFrom, dateTo, locationId, enabled: isOpen });
  const [showAll, setShowAll] = useState(false);

  const stylists = data || [];
  const orgAvg = stylists.length > 0
    ? stylists.reduce((s, st) => s + st.totalRevenue, 0) / stylists.reduce((s, st) => s + st.transactionCount, 0)
    : 0;
  const visible = showAll ? stylists : stylists.slice(0, MAX_VISIBLE);
  const hasMore = stylists.length > MAX_VISIBLE;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium">
                Avg Ticket by Stylist
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : stylists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            ) : (
              <>
                <ScrollArea className={showAll && stylists.length > 8 ? 'max-h-[280px]' : undefined}>
                  <div className="space-y-0.5">
                    {visible.map((st, i) => (
                      <StylistTicketRow key={st.phorestStaffId} stylist={st} delay={i * 0.04} orgAvg={orgAvg} />
                    ))}
                  </div>
                </ScrollArea>
                {hasMore && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
                  >
                    <ChevronDown className={cn('w-3 h-3 transition-transform', showAll && 'rotate-180')} />
                    {showAll ? 'Show less' : `Show all ${stylists.length}`}
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
