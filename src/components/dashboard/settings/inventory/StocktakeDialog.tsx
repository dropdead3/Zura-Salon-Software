import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useCreateStockCount } from '@/hooks/useStockCounts';
import { useProductLookup } from '@/hooks/useProductLookup';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, ClipboardCheck, Loader2, AlertTriangle, ScanBarcode, List, Check } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StocktakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
}

interface ScanEntry {
  productId: string;
  productName: string;
  sku: string | null;
  counted: number;
  expected: number;
}

export function StocktakeDialog({ open, onOpenChange, locationId }: StocktakeDialogProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: products, isLoading } = useProducts({
    locationId: locationId !== 'all' ? locationId : undefined,
  });
  const createStockCount = useCreateStockCount();
  const productLookup = useProductLookup();
  const isMobile = useIsMobile();

  const [scanMode, setScanMode] = useState(false);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // Scan mode state
  const [scanInput, setScanInput] = useState('');
  const [scanEntries, setScanEntries] = useState<ScanEntry[]>([]);
  const [scanFlash, setScanFlash] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Focus scan input when entering scan mode
  useEffect(() => {
    if (scanMode && open) {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [scanMode, open]);

  // ─── Manual Mode Logic ───
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

  const manualEntries = useMemo(() => {
    return Array.from(counts.entries())
      .filter(([, val]) => val !== '')
      .map(([productId, counted]) => ({
        productId,
        counted: parseInt(counted),
        expected: products?.find(p => p.id === productId)?.quantity_on_hand ?? 0,
      }))
      .filter(e => !isNaN(e.counted));
  }, [counts, products]);

  const setCount = (productId: string, value: string) => {
    setCounts(prev => {
      const next = new Map(prev);
      if (value === '') next.delete(productId);
      else next.set(productId, value);
      return next;
    });
  };

  // ─── Scan Mode Logic ───
  const handleScan = useCallback(async () => {
    const code = scanInput.trim();
    if (!code) return;

    setScanError(null);
    setScanInput('');

    try {
      const result = await productLookup.mutateAsync(code);

      if (result.product) {
        // Check if already scanned — if so, increment
        const existing = scanEntries.find(e => e.productId === result.product!.id);
        if (existing) {
          setScanEntries(prev => prev.map(e =>
            e.productId === result.product!.id
              ? { ...e, counted: e.counted + 1 }
              : e
          ));
          triggerFlash();
          setTimeout(() => scanInputRef.current?.focus(), 50);
        } else {
          // Show pending for quantity confirmation
          setPendingProduct(result.product);
          setPendingQty('1');
          setTimeout(() => qtyInputRef.current?.focus(), 50);
        }
      } else if (result.matches.length > 0) {
        // Multiple matches — use first one but show info
        setPendingProduct(result.matches[0]);
        setPendingQty('1');
        setScanError(`${result.matches.length} matches found — showing first match`);
        setTimeout(() => qtyInputRef.current?.focus(), 50);
      } else {
        setScanError(`No product found for "${code}"`);
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    } catch {
      setScanError('Lookup failed — try again');
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [scanInput, productLookup, scanEntries]);

  const confirmPendingProduct = useCallback(() => {
    if (!pendingProduct) return;
    const qty = parseInt(pendingQty);
    if (isNaN(qty) || qty < 0) return;

    const existing = scanEntries.find(e => e.productId === pendingProduct.id);
    if (existing) {
      setScanEntries(prev => prev.map(e =>
        e.productId === pendingProduct.id
          ? { ...e, counted: e.counted + qty }
          : e
      ));
    } else {
      setScanEntries(prev => [...prev, {
        productId: pendingProduct.id,
        productName: pendingProduct.name,
        sku: pendingProduct.sku ?? null,
        counted: qty,
        expected: pendingProduct.quantity_on_hand ?? 0,
      }]);
    }

    setPendingProduct(null);
    setPendingQty('1');
    triggerFlash();
    setTimeout(() => scanInputRef.current?.focus(), 50);
  }, [pendingProduct, pendingQty, scanEntries]);

  const triggerFlash = () => {
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 400);
  };

  // ─── Submit ───
  const allEntries = scanMode
    ? scanEntries.map(e => ({ productId: e.productId, counted: e.counted, expected: e.expected }))
    : manualEntries;

  const totalVariance = allEntries.reduce((s, e) => {
    const v = e.counted - e.expected;
    return s + (v < 0 ? v : 0);
  }, 0);

  const handleSubmit = async () => {
    if (!orgId || allEntries.length === 0) return;
    setSubmitting(true);

    try {
      for (const entry of allEntries) {
        await createStockCount.mutateAsync({
          organization_id: orgId,
          product_id: entry.productId,
          counted_quantity: entry.counted,
          expected_quantity: entry.expected,
          location_id: locationId !== 'all' ? locationId : undefined,
        });
      }
      toast.success(`${allEntries.length} stock count(s) recorded`);
      setCounts(new Map());
      setScanEntries([]);
      onOpenChange(false);
    } catch {
      // error handled by mutation
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-h-[85vh] flex flex-col p-0',
        scanMode ? 'max-w-lg' : 'max-w-2xl',
      )}>
        {/* Flash overlay */}
        {scanFlash && (
          <div className="absolute inset-0 bg-emerald-500/10 rounded-xl z-50 pointer-events-none animate-in fade-in-0 duration-200" />
        )}

        <DialogHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className={tokens.heading.card}>
              <ClipboardCheck className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              Physical Stock Count
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant={scanMode ? 'default' : 'outline'}
                size="sm"
                className="text-xs gap-1.5 h-8"
                onClick={() => { setScanMode(true); setScanError(null); setPendingProduct(null); }}
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                Scan
              </Button>
              <Button
                variant={!scanMode ? 'default' : 'outline'}
                size="sm"
                className="text-xs gap-1.5 h-8"
                onClick={() => setScanMode(false)}
              >
                <List className="w-3.5 h-3.5" />
                Manual
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {scanMode
              ? 'Scan barcodes or type SKUs to quickly count products.'
              : 'Enter actual quantities for each product. Only products with entered counts will be recorded.'}
          </p>
        </DialogHeader>

        {/* ─── Scan Mode ─── */}
        {scanMode ? (
          <>
            <div className="px-6 pb-3 space-y-3">
              {/* Scan input */}
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  ref={scanInputRef}
                  placeholder="Scan barcode or type SKU..."
                  value={scanInput}
                  onChange={e => { setScanInput(e.target.value); setScanError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
                  className={cn('pl-11 h-12 text-base', isMobile && 'text-lg')}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoFocus
                />
                {productLookup.isPending && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Error message */}
              {scanError && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {scanError}
                </div>
              )}

              {/* Pending product confirmation */}
              {pendingProduct && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pendingProduct.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pendingProduct.sku && <span>SKU: {pendingProduct.sku} · </span>}
                      System qty: {pendingProduct.quantity_on_hand ?? 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      ref={qtyInputRef}
                      type="number"
                      value={pendingQty}
                      onChange={e => setPendingQty(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmPendingProduct(); }}
                      className="h-10 w-16 text-center tabular-nums"
                      min={0}
                      onFocus={e => e.target.select()}
                    />
                    <Button size="sm" className="h-10 px-3" onClick={confirmPendingProduct}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Scanned items list */}
            <div className="flex-1 overflow-auto px-6">
              {scanEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ScanBarcode className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No items scanned yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Scan a barcode or type a SKU above to begin</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right w-20')}>System</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right w-20')}>Counted</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right w-20')}>Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanEntries.map(e => {
                      const variance = e.counted - e.expected;
                      const hasShrinkage = variance < 0;
                      return (
                        <TableRow key={e.productId} className={cn(hasShrinkage && 'bg-red-50/50 dark:bg-red-950/10')}>
                          <TableCell className="py-2">
                            <p className="text-sm font-medium truncate max-w-[200px]">{e.productName}</p>
                            {e.sku && <p className="text-[10px] text-muted-foreground">{e.sku}</p>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums py-2">{e.expected}</TableCell>
                          <TableCell className="text-right py-2">
                            <Input
                              type="number"
                              value={e.counted}
                              onChange={ev => {
                                const val = parseInt(ev.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  setScanEntries(prev => prev.map(s =>
                                    s.productId === e.productId ? { ...s, counted: val } : s
                                  ));
                                }
                              }}
                              className="h-7 w-16 text-right tabular-nums ml-auto"
                              min={0}
                            />
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] tabular-nums',
                                variance < 0
                                  ? 'text-red-500 border-red-200 dark:border-red-800'
                                  : variance > 0
                                    ? 'text-emerald-600 border-emerald-200 dark:border-emerald-800'
                                    : 'text-muted-foreground',
                              )}
                            >
                              {variance > 0 ? '+' : ''}{variance}
                              {hasShrinkage && <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        ) : (
          /* ─── Manual Mode ─── */
          <>
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
                <DashboardLoader size="md" className="py-12" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right w-24')}>System Qty</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right w-28')}>Actual Count</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right w-20')}>Variance</TableHead>
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
                          <TableCell className="text-right tabular-nums py-2">{expected}</TableCell>
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
                                      : 'text-muted-foreground',
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
          </>
        )}

        <DialogFooter className="p-6 pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground space-x-1">
              <span>{allEntries.length} product{allEntries.length !== 1 ? 's' : ''} counted</span>
              {totalVariance < 0 && (
                <span className="text-red-500">· {Math.abs(totalVariance)} unit shrinkage</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size={tokens.button.card}
                disabled={allEntries.length === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Record {allEntries.length} Count{allEntries.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
