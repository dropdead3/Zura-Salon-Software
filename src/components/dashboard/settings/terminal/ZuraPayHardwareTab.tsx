import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useOrgConnectStatus } from '@/hooks/useZuraPayConnect';
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
import { Loader2, Plus, CreditCard, Smartphone, Package, Clock, CheckCircle2, Truck, XCircle, Signal, ShoppingCart, DollarSign, Check, Wifi } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useTerminalRequests, useCreateTerminalRequest } from '@/hooks/useTerminalRequests';
import { useTerminalHardwareSkus, useCreateTerminalCheckout } from '@/hooks/useTerminalHardwareOrder';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ReaderModel = 's700' | 's710';

const READER_MODELS: Record<ReaderModel, {
  name: string;
  subtitle: string;
  label: string;
  features: string[];
  icon: React.ElementType;
  recommended?: boolean;
}> = {
  s700: {
    name: 'Zura Pay Reader S700',
    subtitle: 'Countertop & handheld',
    label: 'Standard connectivity',
    features: ['WiFi connectivity', 'Store-and-forward offline payments', '4" touchscreen display'],
    icon: Smartphone,
  },
  s710: {
    name: 'Zura Pay Reader S710',
    subtitle: 'Countertop & handheld',
    label: 'Full NeverDown protection',
    features: ['WiFi + Cellular failover (built-in eSIM)', 'Real-time auth during WiFi outages', 'Store-and-forward offline payments', '4" touchscreen display'],
    icon: Signal,
    recommended: true,
  },
};

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
  const { data: connectStatus } = useOrgConnectStatus(orgId);
  const isOrgConnected = connectStatus?.stripe_connect_status === 'active';
  const { data: requests, isLoading: requestsLoading } = useTerminalRequests(isOrgConnected ? orgId : undefined);
  const { data: skuData, isLoading: skuLoading } = useTerminalHardwareSkus('US', isOrgConnected);
  const createCheckout = useCreateTerminalCheckout();
  const createRequest = useCreateTerminalRequest();
  const { formatCurrency } = useFormatCurrency();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reqLocationId, setReqLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedModel, setSelectedModel] = useState<ReaderModel>('s710');
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

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

  const handleOrderModel = useCallback((model: ReaderModel) => {
    setSelectedModel(model);
    setDialogOpen(true);
  }, []);

  // Derive per-model SKU data from dedicated arrays
  const s700Sku = skuData?.s700_skus?.[0] || skuData?.skus?.[0];
  const s710Sku = skuData?.s710_skus?.[0] || s700Sku;

  const getModelSku = (model: ReaderModel) => model === 's710' ? s710Sku : s700Sku;
  const activeSku = getModelSku(selectedModel);

  const readerPrice = activeSku?.amount || 29900;
  const readerCurrency = activeSku?.currency || 'usd';
  const readerImage = activeSku?.image_url;
  const accessories = skuData?.accessories || [];
  const accessoriesTotalCents = accessories.reduce((sum, acc) => {
    const qty = selectedAccessories[acc.id] || 0;
    return sum + (acc.amount * qty);
  }, 0);
  const totalPrice = (readerPrice * quantity) + accessoriesTotalCents;
  const pricingSource = skuData?.source || 'fallback';
  const readerImageFailed = readerImage ? failedImages.has(readerImage) : true;

  const modelConfig = READER_MODELS[selectedModel];

  const toggleAccessory = (id: string) => {
    setSelectedAccessories((prev) => {
      const next = { ...prev };
      if (next[id]) { delete next[id]; } else { next[id] = 1; }
      return next;
    });
  };

  const handlePurchase = () => {
    if (!orgId || (!reqLocationId && !locations[0]?.id)) return;
    handleDialogClose();
    toast.info('Redirecting to secure checkout…');
    const selectedAccList = accessories
      .filter((acc) => selectedAccessories[acc.id])
      .map((acc) => ({
        id: acc.id, name: acc.product, quantity: selectedAccessories[acc.id], unit_price_cents: acc.amount,
      }));

    const items = [
      {
        name: modelConfig.name, amount: readerPrice, quantity,
        currency: readerCurrency, description: `Terminal reader — ${modelConfig.label}`,
        sku_id: activeSku?.id || (selectedModel === 's710' ? 's710_reader' : 's700_reader'),
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
        notes: `${modelConfig.name} — ${selectedAccList.length} accessor${selectedAccList.length === 1 ? 'y' : 'ies'} selected`,
      },
      {
        onSuccess: () => {
          const currentPath = window.location.pathname;
          createCheckout.mutate({
            organizationId: orgId, locationId: reqLocationId || undefined, items,
            successUrl: `${window.location.origin}${currentPath}?category=terminals&subtab=hardware`,
            cancelUrl: `${window.location.origin}${currentPath}?category=terminals&subtab=hardware`,
          });
        },
        onError: (err) => {
          console.error('[ZuraPay] Hardware request record failed — aborting checkout', err);
          toast.error('Failed to create hardware request. Please try again.');
        },
      }
    );
  };

  if (!isOrgConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-display text-sm tracking-[0.14em]">PAYMENT SETUP REQUIRED</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Complete your Zura Pay setup in the Location Set Up tab before ordering hardware.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  <MetricInfoTooltip description="Purchase Zura Pay Reader terminals at cost. Pricing comes directly from the payment processor — Zura applies zero markup." />
                </div>
                <CardDescription>Choose your reader model — zero markup, direct processor pricing.</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {(Object.entries(READER_MODELS) as [ReaderModel, typeof READER_MODELS[ReaderModel]][]).map(([model, config]) => {
              const ModelIcon = config.icon;
              const sku = getModelSku(model);
              const cardPrice = sku?.amount || 29900;
              const cardImage = sku?.image_url;
              const cardImageFailed = cardImage ? failedImages.has(cardImage) : true;
              return (
                <div
                  key={model}
                  className={cn(
                    'relative flex flex-col rounded-xl border p-5 bg-muted/30 transition-all',
                    config.recommended ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-border/60'
                  )}
                >
                  {config.recommended && (
                    <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Recommended
                    </Badge>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    {cardImage && !cardImageFailed ? (
                      <img
                        src={cardImage}
                        alt={config.name}
                        className="w-10 h-10 rounded-lg object-contain bg-white shrink-0"
                        onError={() => handleImageError(cardImage)}
                      />
                    ) : (
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        config.recommended ? 'bg-emerald-500/10' : 'bg-primary/10'
                      )}>
                        <ModelIcon className={cn('w-5 h-5', config.recommended ? 'text-emerald-600' : 'text-primary')} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-sans font-medium text-sm">{config.name}</p>
                      <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-[11px] font-display tracking-[0.12em] text-muted-foreground mb-2">{config.label.toUpperCase()}</p>

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {config.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', config.recommended ? 'text-emerald-500' : 'text-primary/60')} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <div>
                      {skuLoading ? (
                        <Skeleton className="h-6 w-20" />
                      ) : (
                        <>
                          <p className="font-display text-lg tracking-wide">{formatCurrency(cardPrice / 100)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {pricingSource === 'stripe_api' ? 'Live pricing' : 'Published rate'} · No markup
                          </p>
                        </>
                      )}
                    </div>
                    <Button
                      size={tokens.button.card}
                      className={cn(
                        tokens.button.cardAction,
                        config.recommended && 'bg-emerald-600 text-white hover:bg-emerald-700'
                      )}
                      onClick={() => handleOrderModel(model)}
                    >
                      <Plus className="h-4 w-4" />
                      Order
                    </Button>
                  </div>
                </div>
              );
            })}
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
                        Reader{req.quantity > 1 ? ` × ${req.quantity}` : ''}
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
              <DialogTitle className="font-display text-lg tracking-wide">ORDER {modelConfig.name.toUpperCase()}</DialogTitle>
              <DialogDescription>Purchase at direct processor cost — zero markup. Shipping address collected at checkout.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Model selector */}
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(READER_MODELS) as [ReaderModel, typeof READER_MODELS[ReaderModel]][]).map(([model, config]) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={cn(
                      'relative flex items-center gap-2 p-3 rounded-lg border text-left transition-all',
                      selectedModel === model
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-sm'
                        : 'bg-muted/30 border-border hover:border-primary/20'
                    )}
                  >
                    {selectedModel === model && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      selectedModel === model ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      {model === 's710' ? <Signal className={cn("w-4 h-4", selectedModel === model ? "text-primary" : "text-muted-foreground")} /> : <Wifi className={cn("w-4 h-4", selectedModel === model ? "text-primary" : "text-muted-foreground")} />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-sans text-xs font-medium", selectedModel === model && "text-primary")}>{model === 's700' ? 'S700' : 'S710'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{model === 's710' ? 'WiFi + Cellular' : 'WiFi only'}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Price display */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3">
                  {readerImage && !readerImageFailed ? (
                    <img src={readerImage} alt={modelConfig.name} className="w-14 h-14 rounded-lg object-contain bg-white" onError={() => handleImageError(readerImage)} />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                      <modelConfig.icon className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-sans font-medium text-sm">{modelConfig.name}</p>
                    <p className="text-xs text-muted-foreground">{modelConfig.label}</p>
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
                              {acc.description && <p className="font-sans text-xs text-muted-foreground">{acc.description}</p>}
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
                  <span className="text-muted-foreground font-sans">{selectedModel === 's710' ? 'S710' : 'S700'} × {quantity}</span>
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
              {selectedModel === 's710' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
                  <Signal className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="font-sans text-xs text-muted-foreground">
                    The S710 includes a built-in eSIM with cellular data bundled — no carrier contract or SIM card required. Cellular failover is enabled automatically.
                  </p>
                </div>
              )}
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