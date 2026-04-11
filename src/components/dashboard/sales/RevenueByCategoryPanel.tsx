import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Layers, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useRevenueByCategoryDrilldown, type CategoryBreakdownData, type CategoryStylistData } from '@/hooks/useRevenueByCategoryDrilldown';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { formatDateShort } from '@/lib/format';

const FALLBACK_COLOR = '#888888';

interface RevenueByCategoryPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

const MAX_VISIBLE = 5;

/** Level 3: Individual items for a stylist within a category */
function StylistItemsPanel({ items }: { items?: { itemName: string; amount: number; date: string }[] }) {
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const list = items || [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pl-6 border-l-2 border-primary/20 mt-2 space-y-0.5">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No item details</p>
        ) : (
          list.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-1 border-b border-border/10 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs truncate">{item.itemName}</p>
                {item.date && (
                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {formatDateShort(item.date)}
                  </p>
                )}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground ml-3">
                <BlurredAmount>{fmtWhole(Math.round(item.amount))}</BlurredAmount>
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

/** Level 2: Stylists within a category */
function StylistRow({ stylist, delay, categoryName }: { stylist: CategoryStylistData; delay: number; categoryName: string }) {
  const [expanded, setExpanded] = useState(false);
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const isOverageFees = categoryName === 'Chemical Overage Fees';
  const itemLabel = isOverageFees ? 'charge' : 'appointment';

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
            {stylist.count} {itemLabel}{stylist.count !== 1 ? 's' : ''} · {stylist.sharePercent}% of category
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
        {expanded && (
          isOverageFees ? (
            <ServiceDetailsPanel serviceDetails={stylist.serviceDetails} />
          ) : (
            <StylistItemsPanel items={stylist.items} />
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Service details sub-panel for Chemical Overage Fees */
function ServiceDetailsPanel({ serviceDetails }: { serviceDetails?: { serviceName: string; amount: number }[] }) {
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const details = serviceDetails || [];

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
          <span>Associated services</span>
        </div>
        {details.length === 0 ? (
          <p className="text-xs text-muted-foreground">No service data available</p>
        ) : (
          details.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs px-1">
              <span className="truncate">{d.serviceName}</span>
              <span className="tabular-nums text-muted-foreground ml-2">
                <BlurredAmount>{fmtWhole(Math.round(d.amount))}</BlurredAmount>
              </span>
            </div>
          ))
        )}
      </div>
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
  const isOverage = category.category === 'Chemical Overage Fees';
  const catItemLabel = isOverage ? 'charge' : 'appointment';

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
          <span className="text-sm font-medium">{category.category}</span>
          <p className="text-xs text-muted-foreground">
            {category.sharePercent}% · {category.count} {catItemLabel}{category.count !== 1 ? 's' : ''}
          </p>
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
                <span className="text-xs tracking-[0.1em] font-display uppercase text-muted-foreground font-medium">
                  Top Stylists
                </span>
              </div>
              {category.stylists.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No stylist data</p>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {visibleStylists.map((stylist, i) => (
                      <StylistRow key={stylist.phorestStaffId} stylist={stylist} delay={i * 0.04} categoryName={category.category} />
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
              <span className="font-display text-xs tracking-wide uppercase text-muted-foreground">
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
