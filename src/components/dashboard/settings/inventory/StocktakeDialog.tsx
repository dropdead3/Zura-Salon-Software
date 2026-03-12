import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useCreateStockCount } from '@/hooks/useStockCounts';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Search, ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StocktakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
}

interface CountEntry {
  productId: string;
  counted: string;
  expected: number;
}

export function StocktakeDialog({ open, onOpenChange, locationId }: StocktakeDialogProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: products, isLoading } = useProducts({
    locationId: locationId !== 'all' ? locationId : undefined,
  });
  const createStockCount = useCreateStockCount();
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const entries = useMemo(() => {
    return Array.from(counts.entries())
      .filter(([, val]) => val !== '')
      .map(([productId, counted]) => ({
        productId,
        counted: parseInt(counted),
        expected: products?.find(p => p.id === productId)?.quantity_on_hand ?? 0,
      }))
      .filter(e => !isNaN(e.counted));
  }, [counts, products]);

  const handleSubmit = async () => {
    if (!orgId || entries.length === 0) return;
    setSubmitting(true);

    try {
      for (const entry of entries) {
        await createStockCount.mutateAsync({
          organization_id: orgId,
          product_id: entry.productId,
          counted_quantity: entry.counted,
          expected_quantity: entry.expected,
          location_id: locationId !== 'all' ? locationId : undefined,
        });
      }
      toast.success(`${entries.length} stock count(s) recorded`);
      setCounts(new Map());
      onOpenChange(false);
    } catch (err) {
      // error handled by mutation
    } finally {
      setSubmitting(false);
    }
  };

  const setCount = (productId: string, value: string) => {
    setCounts(prev => {
      const next = new Map(prev);
      if (value === '') {
        next.delete(productId);
      } else {
        next.set(productId, value);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className={tokens.heading.card}>
            <ClipboardCheck className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            Physical Stock Count
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Enter actual quantities for each product. Only products with entered counts will be recorded.
          </p>
        </DialogHeader>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoCapitalize="none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right w-24">System Qty</TableHead>
                  <TableHead className="text-right w-28">Actual Count</TableHead>
                  <TableHead className="text-right w-20">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(p => {
                  const countVal = counts.get(p.id) ?? '';
                  const counted = countVal !== '' ? parseInt(countVal) : null;
                  const expected = p.quantity_on_hand ?? 0;
                  const variance = counted !== null && !isNaN(counted) ? counted - expected : null;
                  const hasShrinkage = variance !== null && variance < 0;

                  return (
                    <TableRow key={p.id} className={cn(hasShrinkage && 'bg-red-50/50 dark:bg-red-950/10')}>
                      <TableCell className="py-2">
                        <p className="text-sm font-medium truncate max-w-[250px]">{p.name}</p>
                        {p.sku && <p className="text-[10px] text-muted-foreground">{p.sku}</p>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-2">
                        {expected}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <Input
                          type="number"
                          value={countVal}
                          onChange={e => setCount(p.id, e.target.value)}
                          className="h-7 w-20 text-right tabular-nums ml-auto"
                          min={0}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {variance !== null ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] tabular-nums',
                              variance < 0
                                ? 'text-red-500 border-red-200 dark:border-red-800'
                                : variance > 0
                                  ? 'text-emerald-600 border-emerald-200 dark:border-emerald-800'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {variance > 0 ? '+' : ''}{variance}
                            {hasShrinkage && <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="p-6 pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {entries.length} product{entries.length !== 1 ? 's' : ''} counted
              {entries.filter(e => e.counted < e.expected).length > 0 && (
                <span className="text-red-500 ml-1">
                  · {entries.filter(e => e.counted < e.expected).length} with shrinkage
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size={tokens.button.card}
                disabled={entries.length === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Record {entries.length} Count{entries.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
