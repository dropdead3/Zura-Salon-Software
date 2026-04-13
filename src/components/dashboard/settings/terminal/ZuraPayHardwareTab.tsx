import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, CreditCard, Smartphone, Package, Clock, CheckCircle2, Truck, XCircle, Signal, ShoppingCart, DollarSign } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useTerminalRequests, useCreateTerminalRequest } from '@/hooks/useTerminalRequests';
import { useTerminalHardwareSkus, useCreateTerminalCheckout, useVerifyTerminalPayment } from '@/hooks/useTerminalHardwareOrder';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const REQUEST_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  approved: { label: 'Approved', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: CheckCircle2 },
  shipped: { label: 'Shipped', className: 'bg-violet-500/10 text-violet-600 border-violet-500/30', icon: Truck },
  delivered: { label: 'Delivered', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  denied: { label: 'Denied', className: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
};

interface ZuraPayHardwareTabProps {
  locations: { id: string; name: string }[];
}

export function ZuraPayHardwareTab({ locations }: ZuraPayHardwareTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: requests, isLoading: requestsLoading } = useTerminalRequests(orgId);
  const { data: skuData, isLoading: skuLoading } = useTerminalHardwareSkus();
  const createCheckout = useCreateTerminalCheckout();
  const createRequest = useCreateTerminalRequest();
  const verifyPayment = useVerifyTerminalPayment();
  const { formatCurrency } = useFormatCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reqLocationId, setReqLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const verifyRef = useRef(verifyPayment.mutate);
  verifyRef.current = verifyPayment.mutate;
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (checkoutStatus === 'success' && sessionId && orgId) {
      verifyRef.current({ sessionId, organizationId: orgId });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('checkout');
      newParams.delete('session_id');
      setSearchParamsRef.current(newParams, { replace: true });
    }
  }, [searchParams, orgId]);

  const handleImageError = useCallback((url: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setQuantity(1);
    setSelectedAccessories({});
    setReqLocationId('');
  }, []);

  const readerPrice = skuData?.skus?.[0]?.amount || 29900;
  const readerCurrency = skuData?.skus?.[0]?.currency || 'usd';
  const readerImage = skuData?.skus?.[0]?.image_url;
  const accessories = skuData?.accessories || [];
  const accessoriesTotalCents = accessories.reduce((sum, acc) => {
    const qty = selectedAccessories[acc.id] || 0;
    return sum + (acc.amount * qty);
  }, 0);
  const totalPrice = (readerPrice * quantity) + accessoriesTotalCents;
  const pricingSource = skuData?.source || 'fallback';
  const readerImageFailed = readerImage ? failedImages.has(readerImage) : true;

  const toggleAccessory = (id: string) => {
    setSelectedAccessories((prev) => {
      const next = { ...prev };
      if (next[id]) { delete next[id]; } else { next[id] = 1; }
      return next;
    });
  };

  const handlePurchase = () => {
    if (!orgId) return;
    const selectedAccList = accessories
      .filter((acc) => selectedAccessories[acc.id])
      .map((acc) => ({
        id: acc.id, name: acc.product, quantity: selectedAccessories[acc.id], unit_price_cents: acc.amount,
      }));

    const items = [
      {
        name: 'Zura Pay Reader S710', amount: readerPrice, quantity,
        currency: readerCurrency, description: 'Terminal reader with cellular + WiFi connectivity',
        sku_id: skuData?.skus?.[0]?.id || 's710_reader',
      },
      ...selectedAccList.map((acc) => ({
        name: acc.name, amount: acc.unit_price_cents, quantity: acc.quantity,
        currency: readerCurrency, description: acc.name, sku_id: acc.id,
      })),
    ];

    createRequest.mutate(
      {
        organizationId: orgId,
        locationId: reqLocationId || locations[0]?.id || '',
        quantity,
        reason: 'additional',
        notes: `Purchase checkout — ${selectedAccList.length} accessor${selectedAccList.length === 1 ? 'y' : 'ies'} selected`,
      },
      {
        onSuccess: () => { createCheckout.mutate({ organizationId: orgId, locationId: reqLocationId || undefined, items }); },
        onError: () => { createCheckout.mutate({ organizationId: orgId, locationId: reqLocationId || undefined, items }); },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <ShoppingCart className={tokens.card.icon} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>ORDER TERMINAL</CardTitle>
                  <MetricInfoTooltip description="Purchase Zura Pay Reader S710 terminals at cost. Pricing comes directly from the payment processor — Zura applies zero markup." />
                </div>
                <CardDescription>Purchase S710 readers at cost — zero markup, direct processor pricing.</CardDescription>
              </div>
            </div>
            <Button size={tokens.button.card} className={tokens.button.cardAction} onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Order Reader
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pricing preview */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div className="flex items-center gap-4">
              {readerImage && !readerImageFailed ? (
                <img src={readerImage} alt="S710 Reader" className="w-12 h-12 rounded-lg object-contain bg-white" onError={() => handleImageError(readerImage)} />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-sans font-medium text-sm">Zura Pay Reader S710</p>
                <p className="text-xs text-muted-foreground">Cellular + WiFi · Store-and-forward · Countertop &amp; handheld</p>
              </div>
            </div>
            <div className="text-right">
              {skuLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <>
                  <p className="font-display text-lg tracking-wide">{formatCurrency(readerPrice / 100)}</p>
                  <p className="text-xs text-muted-foreground">
                    {pricingSource === 'stripe_api' ? 'Live pricing' : 'Published rate'} · No markup
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Zero markup callout */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
            <DollarSign className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="font-sans text-xs text-muted-foreground">
              Terminal pricing is passed through at cost from the payment processor. Zura earns nothing on hardware — we only succeed when your business succeeds.
            </p>
          </div>

          {/* Order history */}
          {requestsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className={tokens.loading.skeleton} />)}
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-sans font-medium">Order History</p>
              {requests.map((req) => {
                const statusConfig = REQUEST_STATUS_CONFIG[req.status] || REQUEST_STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const locName = locations.find((l) => l.id === req.location_id)?.name || req.location_id;
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                    <div>
                      <p className="font-sans font-medium text-sm">
                        S710 Reader{req.quantity > 1 ? ` × ${req.quantity}` : ''}
                        {req.accessories && req.accessories.length > 0 && (
                          <span className="text-muted-foreground font-normal"> + {req.accessories.length} accessor{req.accessories.length === 1 ? 'y' : 'ies'}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {locName} · {format(new Date(req.created_at), 'MMM d, yyyy')}
                        {req.estimated_total_cents ? ` · ${formatCurrency(req.estimated_total_cents / 100)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {req.tracking_number && (
                        <span className="text-xs font-mono text-muted-foreground">{req.tracking_number}</span>
                      )}
                      <Badge variant="outline" className={cn(statusConfig.className, 'gap-1')}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>

        {/* Purchase Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); else setDialogOpen(true); }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-display text-lg tracking-wide">ORDER ZURA PAY READER S710</DialogTitle>
              <DialogDescription>Purchase at direct processor cost — zero markup. Shipping address collected at checkout.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Price display */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3">
                  {readerImage && !readerImageFailed ? (
                    <img src={readerImage} alt="S710 Reader" className="w-14 h-14 rounded-lg object-contain bg-white" onError={() => handleImageError(readerImage)} />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-sans font-medium text-sm">Zura Pay Reader S710</p>
                    <p className="text-xs text-muted-foreground">Cellular + WiFi connectivity</p>
                  </div>
                </div>
                <div className="text-right">
                  {skuLoading ? <Skeleton className="h-6 w-20" /> : (
                    <p className="font-display text-lg tracking-wide">{formatCurrency(readerPrice / 100)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">per unit</p>
                </div>
              </div>

              {/* Accessories */}
              {accessories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Accessories (optional)</Label>
                  <div className="grid gap-2">
                    {accessories.map((acc) => {
                      const isSelected = !!selectedAccessories[acc.id];
                      const accImageFailed = acc.image_url ? failedImages.has(acc.image_url) : true;
                      return (
                        <div key={acc.id} className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          isSelected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border hover:border-primary/20'
                        )}>
                          <button type="button" onClick={() => toggleAccessory(acc.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                            {acc.image_url && !accImageFailed ? (
                              <img src={acc.image_url} alt={acc.product} className="w-10 h-10 rounded object-contain bg-white shrink-0" onError={() => handleImageError(acc.image_url!)} />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-sans text-sm font-medium truncate">{acc.product}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-display text-sm tracking-wide">{formatCurrency(acc.amount / 100)}</p>
                            </div>
                            <Checkbox checked={isSelected} className="shrink-0 pointer-events-none" />
                          </button>
                          {isSelected && (
                            <Select value={String(selectedAccessories[acc.id] || 1)} onValueChange={(v) => setSelectedAccessories((prev) => ({ ...prev, [acc.id]: parseInt(v, 10) }))}>
                              <SelectTrigger className="w-16 h-8 shrink-0"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Ship to Location (optional)</Label>
                <Select value={reqLocationId} onValueChange={setReqLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Select value={String(quantity)} onValueChange={(v) => setQuantity(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Order summary */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-sans">S710 × {quantity}</span>
                  <span className="font-sans font-medium">{formatCurrency((readerPrice * quantity) / 100)}</span>
                </div>
                {accessories.filter((acc) => selectedAccessories[acc.id]).map((acc) => (
                  <div key={acc.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-sans">{acc.product} × {selectedAccessories[acc.id]}</span>
                    <span className="font-sans font-medium">{formatCurrency((acc.amount * selectedAccessories[acc.id]) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium pt-1 border-t">
                  <span className="font-sans">Subtotal</span>
                  <span className="font-display tracking-wide">{formatCurrency(totalPrice / 100)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Shipping &amp; tax</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              {/* S710 info callout */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
                <Signal className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="font-sans text-xs text-muted-foreground">
                  The S710 includes cellular connectivity, ensuring payments continue even when WiFi is down. Store-and-forward technology securely stores payments on-device during total outages.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
              <Button onClick={handlePurchase} disabled={createCheckout.isPending || skuLoading}>
                {createCheckout.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Checkout · {formatCurrency(totalPrice / 100)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
