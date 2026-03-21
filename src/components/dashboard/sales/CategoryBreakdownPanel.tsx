import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrencyWhole } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';

export type BreakdownMode = 'revenue' | 'dailyAvg' | 'count';

export type BreakdownType = 'category' | 'location' | 'stylist';

interface CategoryBreakdownPanelProps {
  data: Record<string, { revenue: number; count: number }>;
  mode: BreakdownMode;
  dayCount: number;
  isOpen: boolean;
  breakdownType?: BreakdownType;
}

const BREAKDOWN_TYPE_LABELS: Record<BreakdownType, string> = {
  category: 'Category',
  location: 'Location',
  stylist: 'Service Provider',
};

const MODE_LABELS: Record<BreakdownMode, string> = {
  revenue: 'Revenue by Category',
  dailyAvg: 'Daily Operating Avg by Category',
  count: 'Appointments by Category',
};

function getSectionLabel(mode: BreakdownMode, breakdownType?: BreakdownType): string {
  const typeLabel = breakdownType ? BREAKDOWN_TYPE_LABELS[breakdownType] : 'Category';
  if (mode === 'revenue') return `Revenue by ${typeLabel}`;
  if (mode === 'dailyAvg') return `Daily Operating Avg by ${typeLabel}`;
  return `Appointments by ${typeLabel}`;
}

function formatValue(mode: BreakdownMode, entry: { revenue: number; count: number }, dayCount: number): string {
  switch (mode) {
    case 'revenue':
      return formatCurrencyWhole(Math.round(entry.revenue));
    case 'dailyAvg':
      return formatCurrencyWhole(Math.round(entry.revenue / Math.max(dayCount, 1))) + '/day';
    case 'count':
      return `${entry.count} appointment${entry.count !== 1 ? 's' : ''}`;
  }
}

function getSortValue(mode: BreakdownMode, entry: { revenue: number; count: number }, dayCount: number): number {
  return mode === 'count' ? entry.count : entry.revenue;
}

export function CategoryBreakdownPanel({ data, mode, dayCount, isOpen, breakdownType = 'category' }: CategoryBreakdownPanelProps) {
  const sorted = useMemo(() => {
    const entries = Object.entries(data).map(([name, vals]) => ({
      name,
      ...vals,
      sortVal: getSortValue(mode, vals, dayCount),
    }));
    entries.sort((a, b) => b.sortVal - a.sortVal);
    return entries;
  }, [data, mode, dayCount]);

  const total = useMemo(() => {
    return sorted.reduce((sum, e) => sum + e.sortVal, 0);
  }, [sorted]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && sorted.length > 0 && (
        <motion.div
          key={mode}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-3 pb-1 space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs tracking-wide uppercase text-muted-foreground font-medium">
                {getSectionLabel(mode, breakdownType)}
              </span>
            </div>
            {sorted.map((entry, index) => {
              const pct = total > 0 ? (entry.sortVal / total) * 100 : 0;
              return (
                <motion.div
                  key={entry.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm text-foreground font-medium min-w-[100px] truncate">
                    {entry.name}
                  </span>
                  <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: index * 0.04, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-[38px] text-right">
                    {Math.round(pct)}%
                  </span>
                  <span className="text-sm font-display tabular-nums min-w-[80px] text-right">
                    {mode === 'count' ? (
                      formatValue(mode, entry, dayCount)
                    ) : (
                      <BlurredAmount>{formatValue(mode, entry, dayCount)}</BlurredAmount>
                    )}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
