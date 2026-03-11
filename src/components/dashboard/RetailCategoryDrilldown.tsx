import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Package, Shirt, Gift, Gem as GemIcon, type LucideIcon } from 'lucide-react';
import { useRetailCategoryItems } from '@/hooks/useRetailCategoryItems';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Skeleton } from '@/components/ui/skeleton';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from './drilldownDialogStyles';
import { ScrollArea } from '@/components/ui/scroll-area';

type RetailCategory = 'Products' | 'Merch' | 'Gift Cards' | 'Extensions';

const CATEGORY_META: Record<RetailCategory, { icon: LucideIcon; color: string }> = {
  Products: { icon: Package, color: 'text-primary' },
  Merch: { icon: Shirt, color: 'text-primary' },
  'Gift Cards': { icon: Gift, color: 'text-primary' },
  Extensions: { icon: GemIcon, color: 'text-primary' },
};

interface RetailCategoryDrilldownProps {
  category: RetailCategory | null;
  onClose: () => void;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function RetailCategoryDrilldown({
  category,
  onClose,
  dateFrom,
  dateTo,
  locationId,
}: RetailCategoryDrilldownProps) {
  const { data: items, isLoading } = useRetailCategoryItems(dateFrom, dateTo, category, locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  if (!category) return null;

  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const totalRevenue = items?.reduce((s, i) => s + i.revenue, 0) ?? 0;
  const totalQty = items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <Dialog open={!!category} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
              <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
            </div>
            <div>
              <DialogTitle className="font-display text-base tracking-wide">{category}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalQty} items · <BlurredAmount><span>{formatCurrencyWhole(totalRevenue)}</span></BlurredAmount> total
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-3 space-y-1">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : !items?.length ? (
              <div className="text-center py-10 text-muted-foreground">
                <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No {category.toLowerCase()} found</p>
                <p className="text-xs mt-1">for this date range</p>
              </div>
            ) : (
              items.map((item, idx) => {
                const pct = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
                return (
                  <div
                    key={item.itemName}
                    className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0"
                  >
                    <span className="text-xs text-muted-foreground/60 w-5 text-right tabular-nums">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.itemName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity} sold · {pct}%
                      </p>
                    </div>
                    <BlurredAmount>
                      <span className="text-sm font-display tabular-nums">{formatCurrencyWhole(item.revenue)}</span>
                    </BlurredAmount>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
