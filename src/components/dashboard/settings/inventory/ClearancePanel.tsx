import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Tag, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useProducts, useUpdateProduct, type Product } from '@/hooks/useProducts';
import { toast } from 'sonner';

interface ClearancePanelProps {
  organizationId: string;
}

const STATUS_CONFIG = {
  marked: { label: 'Marked', color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-500/10' },
  discounted: { label: 'Discounted', color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-500/10' },
  liquidated: { label: 'Liquidated', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-500/10' },
};

export function ClearancePanel({ organizationId }: ClearancePanelProps) {
  const { data: allProducts } = useProducts({});
  const updateProduct = useUpdateProduct();
  const { formatCurrency } = useFormatCurrency();
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});

  const clearanceProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => (p as any).clearance_status != null);
  }, [allProducts]);

  const handleApplyDiscount = (product: Product, pct: number) => {
    if (pct < 1 || pct > 99) {
      toast.error('Discount must be between 1% and 99%');
      return;
    }
    const originalPrice = (product as any).original_retail_price || product.retail_price || 0;
    const newPrice = originalPrice * (1 - pct / 100);
    updateProduct.mutate({
      id: product.id,
      updates: {
        clearance_status: 'discounted',
        clearance_discount_pct: pct,
        retail_price: Math.round(newPrice * 100) / 100,
        original_retail_price: originalPrice,
      } as any,
    });
  };

  const handleMarkLiquidated = (product: Product) => {
    updateProduct.mutate({
      id: product.id,
      updates: {
        clearance_status: 'liquidated',
        is_active: false,
      } as any,
    });
  };

  const handleRemoveFromClearance = (product: Product) => {
    const originalPrice = (product as any).original_retail_price;
    updateProduct.mutate({
      id: product.id,
      updates: {
        clearance_status: null,
        clearance_discount_pct: null,
        clearance_marked_at: null,
        ...(originalPrice ? { retail_price: originalPrice, original_retail_price: null } : {}),
      } as any,
    });
  };

  const totalCapital = clearanceProducts.reduce((s, p) => s + ((p.cost_price ?? 0) * (p.quantity_on_hand ?? 0)), 0);
  const liquidatedCount = clearanceProducts.filter(p => (p as any).clearance_status === 'liquidated').length;

  if (clearanceProducts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">No products marked for clearance</p>
          <p className="text-xs text-muted-foreground mt-1">
            Mark dead weight or stagnant products for clearance from the Products tab to start the liquidation workflow.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In Clearance</p>
            <p className="text-xl font-display tabular-nums mt-1">{clearanceProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Capital at Risk</p>
            <p className="text-xl font-display tabular-nums mt-1"><BlurredAmount>{formatCurrency(totalCapital)}</BlurredAmount></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Liquidated</p>
            <p className="text-xl font-display tabular-nums mt-1">{liquidatedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Original Price</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Discount</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clearanceProducts.map(p => {
              const status = (p as any).clearance_status as keyof typeof STATUS_CONFIG;
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.marked;
              const discountPct = (p as any).clearance_discount_pct;
              const originalPrice = (p as any).original_retail_price || p.retail_price;

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', cfg.color, cfg.border, cfg.bg)}>
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    <BlurredAmount>{formatCurrency(originalPrice ?? 0)}</BlurredAmount>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    <BlurredAmount>{formatCurrency(p.retail_price ?? 0)}</BlurredAmount>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity_on_hand ?? 0}</TableCell>
                  <TableCell className="text-center">
                    {status === 'marked' ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          placeholder="%"
                          value={discountInputs[p.id] || ''}
                          onChange={e => setDiscountInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="w-16 h-7 text-xs text-center"
                        />
                        <Button
                          size={tokens.button.inline}
                          variant="outline"
                          onClick={() => handleApplyDiscount(p, parseInt(discountInputs[p.id] || '30'))}
                          className="text-xs"
                        >
                          Apply
                        </Button>
                      </div>
                    ) : discountPct ? (
                      <span className="text-sm tabular-nums font-medium">{discountPct}% off</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {status !== 'liquidated' && (
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleMarkLiquidated(p)} title="Mark as liquidated">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleRemoveFromClearance(p)} title="Remove from clearance">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
