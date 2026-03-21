import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Users, UserPlus, UserCheck, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useRevenueByCategoryDrilldown, type CategoryBreakdownData, type CategoryStylistData } from '@/hooks/useRevenueByCategoryDrilldown';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';

const FALLBACK_COLOR = '#888888';

interface RevenueByCategoryPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

const MAX_VISIBLE = 5;

/** Level 3: Client mix for a stylist within a category */
function ClientMixPanel({ stylist }: { stylist: CategoryStylistData }) {
  const newPct = stylist.totalClients > 0 ? Math.round((stylist.newClients / stylist.totalClients) * 100) : 0;
  const returnPct = 100 - newPct;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pl-6 border-l-2 border-primary/20 mt-2 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{stylist.totalClients} unique client{stylist.totalClients !== 1 ? 's' : ''}</span>
        </div>
        {/* New vs Returning bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <UserPlus className="w-3 h-3 text-chart-4" />
              <span>New</span>
            </div>
            <span className="tabular-nums">{stylist.newClients} ({newPct}%)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3 h-3 text-primary" />
              <span>Returning</span>
            </div>
            <span className="tabular-nums">{stylist.returningClients} ({returnPct}%)</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-muted/50">
            <div
              className="h-full bg-chart-4"
              style={{ width: `${newPct}%` }}
            />
            <div
              className="h-full bg-primary"
              style={{ width: `${returnPct}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Level 2: Stylists within a category */
function StylistRow({ stylist, delay }: { stylist: CategoryStylistData; delay: number }) {
  const [expanded, setExpanded] = useState(false);
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();

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
            {stylist.count} appointment{stylist.count !== 1 ? 's' : ''} · {stylist.sharePercent}% of category
          </p>
        </div>
        <span className="text-sm font-display tabular-nums">
          <BlurredAmount>{fmtWhole(Math.round(stylist.revenue))}</BlurredAmount>
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground transition-transform',
          expanded && 'rotate-180'
        )} />
      </div>
      <AnimatePresence>
        {expanded && <ClientMixPanel stylist={stylist} />}
      </AnimatePresence>
    </motion.div>
  );
}

/** Level 1: Category row with expandable stylist list */
function CategoryRow({ category, index }: { category: CategoryBreakdownData; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const { colorMap } = useServiceCategoryColorsMap();

  const color = colorMap[category.category.toLowerCase()]?.bg || FALLBACK_COLOR;
  const visibleStylists = showAll ? category.stylists : category.stylists.slice(0, MAX_VISIBLE);
  const hasMore = category.stylists.length > MAX_VISIBLE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-border/30 bg-muted/20 overflow-hidden"
    >
      {/* Category header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{category.category}</span>
            <span className="text-xs text-muted-foreground">{category.sharePercent}%</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Progress
              value={category.sharePercent}
              className="h-1 flex-1 max-w-[120px]"
              indicatorStyle={{ backgroundColor: color }}
            />
            <span className="text-xs text-muted-foreground">{category.count} appointments</span>
          </div>
        </div>
        <span className="text-base font-display tabular-nums">
          <BlurredAmount>{fmtWhole(Math.round(category.revenue))}</BlurredAmount>
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-muted-foreground transition-transform',
          expanded && 'rotate-180'
        )} />
      </div>

      {/* Stylist list (Level 2) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-6 border-l-2 border-primary/20 ml-4">
              <div className="flex items-center gap-2 mb-2 pt-1">
                <Layers className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs tracking-[0.1em] uppercase text-muted-foreground font-medium">
                  Top Stylists
                </span>
              </div>
              {category.stylists.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No stylist data</p>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {visibleStylists.map((stylist, i) => (
                      <StylistRow key={stylist.phorestStaffId} stylist={stylist} delay={i * 0.04} />
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                      className="text-xs text-primary hover:underline mt-2 flex items-center gap-1"
                    >
                      <ChevronDown className={cn('w-3 h-3 transition-transform', showAll && 'rotate-180')} />
                      {showAll ? 'Show less' : `Show all ${category.stylists.length}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function RevenueByCategoryPanel({ isOpen, dateFrom, dateTo, locationId }: RevenueByCategoryPanelProps) {
  const { data, isLoading } = useRevenueByCategoryDrilldown({
    dateFrom,
    dateTo,
    locationId,
    enabled: isOpen,
  });

  const [showAll, setShowAll] = useState(false);
  const categories = data || [];
  const visibleCategories = showAll ? categories : categories.slice(0, MAX_VISIBLE);
  const hasMore = categories.length > MAX_VISIBLE;

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
                Revenue by Category
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No category data available</p>
            ) : (
              <>
                <div className="space-y-2">
                  {visibleCategories.map((cat, i) => (
                    <CategoryRow key={cat.category} category={cat} index={i} />
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
                  >
                    <ChevronDown className={cn('w-3 h-3 transition-transform', showAll && 'rotate-180')} />
                    {showAll ? 'Show less' : `Show all ${categories.length} categories`}
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
