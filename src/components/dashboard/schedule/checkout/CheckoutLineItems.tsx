import { useState } from 'react';
import { Plus, X, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { LineDiscountPopover } from './LineDiscountPopover';
import {
  type CheckoutLineItem,
  type CheckoutLineDiscount,
  computeLineNet,
} from '@/hooks/useCheckoutCart';

interface CheckoutLineItemsProps {
  lines: CheckoutLineItem[];
  /** Permission gate — when false, override/waive controls are hidden or disabled */
  canOverridePrice: boolean;
  canWaive: boolean;
  /** Max % stylists can apply without manager approval (e.g. 20). Pass 100 for unlimited. */
  maxDiscountPercent: number;
  onAddService: () => void;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onPriceChange: (id: string, unitPrice: number) => void;
  onApplyDiscount: (id: string, discount: CheckoutLineDiscount) => void;
  onClearDiscount: (id: string) => void;
}

export function CheckoutLineItems({
  lines,
  canOverridePrice,
  canWaive,
  maxDiscountPercent,
  onAddService,
  onRemove,
  onQuantityChange,
  onPriceChange,
  onApplyDiscount,
  onClearDiscount,
}: CheckoutLineItemsProps) {
  const { formatCurrency } = useFormatCurrency();
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>('');

  const startEditPrice = (line: CheckoutLineItem) => {
    if (!canOverridePrice) return;
    setEditingPriceId(line.id);
    setPriceDraft(line.unitPrice.toString());
  };

  const commitPrice = (line: CheckoutLineItem) => {
    const next = parseFloat(priceDraft);
    if (!isNaN(next) && next >= 0 && next !== line.unitPrice) {
      onPriceChange(line.id, next);
    }
    setEditingPriceId(null);
    setPriceDraft('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Services</h3>
        <Button
          variant="outline"
          onClick={onAddService}
          className={cn(tokens.button.cardAction, 'gap-1.5')}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Service
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
          <p className="text-sm text-muted-foreground">Add a service to begin</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-3 py-2 border-b border-border/60 bg-muted/30">
            <span className={cn(tokens.table.columnHeader, 'text-xs')}>Service</span>
            <span className={cn(tokens.table.columnHeader, 'text-xs text-center')}>Qty</span>
            <span className={cn(tokens.table.columnHeader, 'text-xs text-right')}>Price</span>
            <span className={cn(tokens.table.columnHeader, 'text-xs text-right')}>Disc.</span>
            <span className="w-6" />
          </div>

          <div className="divide-y divide-border/40">
            {lines.map((line) => {
              const net = computeLineNet(line);
              const hasDiscount = !!line.discount;
              const isWaived = line.discount?.type === 'waive';
              const isOverridden =
                line.originalUnitPrice != null && line.unitPrice !== line.originalUnitPrice;
              const isUnset = line.priceSource === 'unset';

              return (
                <div
                  key={line.id}
                  className={cn(
                    'grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-3 py-2.5 items-center',
                    line.isOriginal && 'border-l-2 border-l-primary/40',
                  )}
                >
                  {/* Name + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{line.name}</span>
                      {!line.isOriginal && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Added
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {isUnset && (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          Price not set
                        </span>
                      )}
                      {!isUnset && line.priceSource && line.priceSource !== 'pos' && (
                        <span>
                          {line.priceSource === 'location-override'
                            ? 'Local price'
                            : line.priceSource === 'catalog'
                            ? 'Catalog price'
                            : 'Manual'}
                        </span>
                      )}
                      {isOverridden && (
                        <span className="text-warning">
                          (was {formatCurrency(line.originalUnitPrice!)})
                        </span>
                      )}
                      {hasDiscount && line.discount?.reason && (
                        <span>· {line.discount.reason}</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onQuantityChange(line.id, Math.max(1, line.quantity - 1))}
                      disabled={line.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm tabular-nums w-5 text-center">{line.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onQuantityChange(line.id, line.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Price (click to edit if permitted) */}
                  <div className="text-right min-w-[80px]">
                    {editingPriceId === line.id ? (
                      <Input
                        type="number"
                        value={priceDraft}
                        onChange={(e) => setPriceDraft(e.target.value)}
                        onBlur={() => commitPrice(line)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitPrice(line);
                          if (e.key === 'Escape') {
                            setEditingPriceId(null);
                            setPriceDraft('');
                          }
                        }}
                        className="h-7 text-sm text-right tabular-nums"
                        autoFocus
                        step="0.01"
                        min={0}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditPrice(line)}
                        disabled={!canOverridePrice}
                        className={cn(
                          'text-sm tabular-nums tabular',
                          isOverridden && 'text-warning',
                          isWaived && 'line-through text-muted-foreground',
                          canOverridePrice && 'hover:text-primary cursor-pointer',
                          !canOverridePrice && 'cursor-default',
                        )}
                        title={canOverridePrice ? 'Click to edit price' : 'Manager approval required'}
                      >
                        <BlurredAmount>{formatCurrency(line.unitPrice)}</BlurredAmount>
                      </button>
                    )}
                  </div>

                  {/* Discount */}
                  <LineDiscountPopover
                    current={line.discount}
                    maxPercent={maxDiscountPercent}
                    canWaive={canWaive}
                    onApply={(d) => onApplyDiscount(line.id, d)}
                    onClear={() => onClearDiscount(line.id)}
                  />

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(line.id)}
                    title="Remove line"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
