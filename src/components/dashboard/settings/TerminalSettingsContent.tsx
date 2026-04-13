import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MapPin, Plus, Trash2, Wifi, WifiOff, CreditCard, Smartphone, Building2, Package, Clock, CheckCircle2, Truck, XCircle, Signal, ShoppingCart, DollarSign } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useTerminalLocations, useTerminalReaders,
  useCreateTerminalLocation, useDeleteTerminalLocation,
  useRegisterReader, useDeleteReader,
} from '@/hooks/useStripeTerminals';
import { useTerminalRequests, useCreateTerminalRequest } from '@/hooks/useTerminalRequests';
import { useTerminalHardwareSkus, useCreateTerminalCheckout, useVerifyTerminalPayment } from '@/hooks/useTerminalHardwareOrder';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { OfflinePaymentStatus } from './OfflinePaymentStatus';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

// Fetch org locations that have Zura Pay (stripe_account_id)
function useZuraPayLocations() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['zura-pay-locations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, stripe_account_id, address, city, state_province')
        .eq('organization_id', orgId!)
        .not('stripe_account_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

// ---- Register Reader Wizard ----

interface RegisterReaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  terminalLocations: { id: string; display_name: string }[];
}

function RegisterReaderDialog({ open, onOpenChange, locationId, terminalLocations }: RegisterReaderDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTerminalLocation, setSelectedTerminalLocation] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [readerLabel, setReaderLabel] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const registerReader = useRegisterReader();

  const handleClose = () => {
    setStep(1);
    setSelectedTerminalLocation('');
    setRegistrationCode('');
    setReaderLabel('');
    setInlineError(null);
    onOpenChange(false);
  };

  const handleRegister = () => {
    setInlineError(null);
    registerReader.mutate(
      {
        locationId,
        terminalLocationId: selectedTerminalLocation,
        registrationCode: registrationCode.trim(),
        label: readerLabel.trim() || undefined,
      },
      {
        onSuccess: () => {
          setStep(3);
        },
        onError: (error) => {
          setInlineError((error as Error).message || 'Registration failed. Please check the pairing code and try again.');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide">
            {step === 3 ? 'READER REGISTERED' : 'REGISTER TERMINAL READER'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Select the terminal location to assign this reader to.'}
            {step === 2 && 'Enter the pairing code shown on your terminal screen.'}
            {step === 3 && 'Your reader has been successfully paired and is ready to accept payments.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            {terminalLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No terminal locations found. Create a terminal location first before registering a reader.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Terminal Location</Label>
                  <Select value={selectedTerminalLocation} onValueChange={setSelectedTerminalLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a terminal location" />
                    </SelectTrigger>
                    <SelectContent>
                      {terminalLocations.map((tl) => (
                        <SelectItem key={tl.id} value={tl.id}>
                          {tl.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={() => setStep(2)} disabled={!selectedTerminalLocation}>
                    Next
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Pairing Code</Label>
              <Input
                placeholder="e.g. simulated-wpe"
                value={registrationCode}
                onChange={(e) => {
                  setRegistrationCode(e.target.value);
                  if (inlineError) setInlineError(null);
                }}
                className={cn(
                  "font-mono text-lg tracking-widest",
                  inlineError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {inlineError ? (
                <p className="text-xs text-destructive">{inlineError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Find this code on your terminal device screen during setup mode.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reader Label (optional)</Label>
              <Input
                placeholder="e.g. Front Desk Reader 1"
                value={readerLabel}
                onChange={(e) => setReaderLabel(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep(1); setInlineError(null); }}>Back</Button>
              <Button
                onClick={handleRegister}
                disabled={!registrationCode.trim() || registerReader.isPending}
              >
                {registerReader.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Register Reader
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Wifi className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---- All Locations Summary ----

interface LocationSummaryRowProps {
  loc: { id: string; name: string };
}

function LocationSummaryRow({ loc }: LocationSummaryRowProps) {
  const { data: tlData, isLoading: tlLoading } = useTerminalLocations(loc.id);
  const { data: readerData, isLoading: readersLoading } = useTerminalReaders(loc.id);

  if (tlLoading || readersLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 items-center px-3 py-3 rounded-lg bg-muted/30 border">
        <span className="font-sans font-medium text-sm truncate">{loc.name}</span>
        <Skeleton className="h-4 w-8 mx-auto" />
        <Skeleton className="h-4 w-8 mx-auto" />
        <Skeleton className="h-4 w-16 mx-auto" />
      </div>
    );
  }

  const readerList = readerData || [];
  const online = readerList.filter((r) => r.status === 'online').length;
  const offline = readerList.length - online;

  return (
    <div className="grid grid-cols-4 gap-2 items-center px-3 py-3 rounded-lg bg-muted/30 border">
      <span className="font-sans font-medium text-sm truncate">{loc.name}</span>
      <span className="text-center text-sm text-muted-foreground">{tlData?.length || 0}</span>
      <span className="text-center text-sm text-muted-foreground">{readerList.length}</span>
      <div className="flex items-center justify-center gap-2">
        {online > 0 && (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 text-xs">
            {online} online
          </Badge>
        )}
        {offline > 0 && (
          <Badge variant="secondary" className="text-xs">
            {offline} offline
          </Badge>
        )}
        {readerList.length === 0 && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

interface AllLocationsSummaryProps {
  locations: { id: string; name: string; stripe_account_id: string | null }[];
}

function AllLocationsSummary({ locations }: AllLocationsSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Building2 className={tokens.card.icon} />
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className={tokens.card.title}>FLEET OVERVIEW</CardTitle>
            <MetricInfoTooltip description="Summary of all terminal locations and readers across your organization's Zura Pay-connected sites." />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs text-muted-foreground font-sans">
            <span>Location</span>
            <span className="text-center">Terminal Locations</span>
            <span className="text-center">Readers</span>
            <span className="text-center">Status</span>
          </div>
          {locations.map((loc) => (
            <LocationSummaryRow key={loc.id} loc={loc} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Status Config for Request History ----

const REQUEST_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  approved: { label: 'Approved', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: CheckCircle2 },
  shipped: { label: 'Shipped', className: 'bg-violet-500/10 text-violet-600 border-violet-500/30', icon: Truck },
  delivered: { label: 'Delivered', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  denied: { label: 'Denied', className: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
};

const REASON_OPTIONS = [
  { value: 'new_location', label: 'New Location' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'additional', label: 'Additional Unit' },
  { value: 'upgrade_to_s710', label: 'Upgrade to S710' },
  { value: 'other', label: 'Other' },
];

// ---- Terminal Purchase Card ----

function TerminalPurchaseCard({ locations }: { locations: { id: string; name: string }[] }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: requests, isLoading: requestsLoading } = useTerminalRequests(orgId);
  const { data: skuData, isLoading: skuLoading } = useTerminalHardwareSkus();
  const createCheckout = useCreateTerminalCheckout();
  const verifyPayment = useVerifyTerminalPayment();
  const { formatCurrency } = useFormatCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reqLocationId, setReqLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Auto-verify payment on return from checkout
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (checkoutStatus === 'success' && sessionId && orgId) {
      verifyPayment.mutate({ sessionId, organizationId: orgId });
      // Clean URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('checkout');
      newParams.delete('session_id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, orgId]);

  const readerPrice = skuData?.skus?.[0]?.amount || 29900;
  const readerCurrency = skuData?.skus?.[0]?.currency || 'usd';
  const totalPrice = readerPrice * quantity;
  const pricingSource = skuData?.source || 'fallback';

  const handlePurchase = () => {
    if (!orgId) return;
    createCheckout.mutate({
      organizationId: orgId,
      locationId: reqLocationId || undefined,
      items: [{
        name: 'Zura Pay Reader S710',
        amount: readerPrice,
        quantity,
        currency: readerCurrency,
        description: 'Terminal reader with cellular + WiFi connectivity',
        sku_id: skuData?.skus?.[0]?.id || 's710_reader',
      }],
    });
  };

  return (
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
          <Button
            size={tokens.button.card}
            className={tokens.button.cardAction}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Order Reader
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing preview */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
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
            {[1, 2].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton} />
            ))}
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-sans font-medium">Order History</p>
            {requests.map((req) => {
              const statusConfig = REQUEST_STATUS_CONFIG[req.status] || REQUEST_STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              const locName = locations.find((l) => l.id === req.location_id)?.name || req.location_id;
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div>
                    <p className="font-sans font-medium text-sm">
                      S710 Reader{req.quantity > 1 ? ` × ${req.quantity}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {locName} · {format(new Date(req.created_at), 'MMM d, yyyy')}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg tracking-wide">ORDER ZURA PAY READER S710</DialogTitle>
            <DialogDescription>
              Purchase at direct processor cost — zero markup. Shipping address collected at checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Price display */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
              <div>
                <p className="font-sans font-medium text-sm">Zura Pay Reader S710</p>
                <p className="text-xs text-muted-foreground">Cellular + WiFi connectivity</p>
              </div>
              <div className="text-right">
                {skuLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="font-display text-lg tracking-wide">{formatCurrency(readerPrice / 100)}</p>
                )}
                <p className="text-xs text-muted-foreground">per unit</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ship to Location (optional)</Label>
              <Select value={reqLocationId} onValueChange={setReqLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Select value={String(quantity)} onValueChange={(v) => setQuantity(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order summary */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-sans">S710 × {quantity}</span>
                <span className="font-sans font-medium">{formatCurrency(totalPrice / 100)}</span>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePurchase}
              disabled={createCheckout.isPending || skuLoading}
            >
              {createCheckout.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CreditCard className="h-4 w-4 mr-2" />
              Proceed to Checkout · {formatCurrency(totalPrice / 100)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---- Main Terminal Settings Content ----

export function TerminalSettingsContent() {
  const { data: locations, isLoading: locationsLoading } = useZuraPayLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteReaderTarget, setDeleteReaderTarget] = useState<{ id: string; label: string } | null>(null);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [isDeletingReader, setIsDeletingReader] = useState(false);

  // Auto-select first location when loaded
  const activeLocationId = showAllLocations ? null : (selectedLocationId || locations?.[0]?.id || null);

  const { data: terminalLocations, isLoading: tlLoading } = useTerminalLocations(activeLocationId);
  const { data: readers, isLoading: readersLoading } = useTerminalReaders(activeLocationId);
  const createTerminalLocation = useCreateTerminalLocation();
  const deleteTerminalLocation = useDeleteTerminalLocation();
  const deleteReader = useDeleteReader();

  if (locationsLoading) {
    return <DashboardLoader size="md" className="h-64" />;
  }

  if (!locations || locations.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No Zura Pay Locations"
        description="Terminal management requires at least one location connected to Zura Pay. Connect a location to Zura Pay from Integrations to get started."
      />
    );
  }

  const selectedLocation = locations.find((l) => l.id === activeLocationId);

  const handleCreateTerminalLocation = () => {
    if (!activeLocationId) return;
    createTerminalLocation.mutate({
      locationId: activeLocationId,
      displayName: selectedLocation?.name,
    });
  };

  const handleDeleteLocation = () => {
    if (!activeLocationId || !deleteLocationTarget) return;
    setIsDeletingLocation(true);
    deleteTerminalLocation.mutate(
      { locationId: activeLocationId, terminalLocationId: deleteLocationTarget.id },
      {
        onSuccess: () => {
          setDeleteLocationTarget(null);
          setIsDeletingLocation(false);
        },
        onError: () => {
          setIsDeletingLocation(false);
        },
      }
    );
  };

  const handleDeleteReader = () => {
    if (!activeLocationId || !deleteReaderTarget) return;
    setIsDeletingReader(true);
    deleteReader.mutate(
      { locationId: activeLocationId, readerId: deleteReaderTarget.id },
      {
        onSuccess: () => {
          setDeleteReaderTarget(null);
          setIsDeletingReader(false);
        },
        onError: () => {
          setIsDeletingReader(false);
        },
      }
    );
  };

  const onlineReaders = readers?.filter((r) => r.status === 'online') || [];
  const offlineReaders = readers?.filter((r) => r.status !== 'online') || [];

  return (
    <div className="space-y-6">
      {/* Location Picker */}
      {locations.length > 1 && (
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Select
            value={showAllLocations ? 'all' : (activeLocationId || '')}
            onValueChange={(v) => {
              if (v === 'all') {
                setShowAllLocations(true);
                setSelectedLocationId(null);
              } else {
                setShowAllLocations(false);
                setSelectedLocationId(v);
              }
            }}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  All Locations
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {locations.length}
                  </Badge>
                </span>
              </SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  <span className="flex items-center gap-2">
                    {loc.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!showAllLocations && (
            <span className="text-xs text-muted-foreground">
              {readers?.length || 0} reader{(readers?.length || 0) !== 1 ? 's' : ''} at this location
            </span>
          )}
        </div>
      )}

      {/* All Locations Summary */}
      {showAllLocations ? (
        <AllLocationsSummary locations={locations} />
      ) : (
        <>
          {/* Terminal Locations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <MapPin className={tokens.card.icon} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className={tokens.card.title}>TERMINAL LOCATIONS</CardTitle>
                      <MetricInfoTooltip description="Terminal locations represent physical sites where your readers accept payments. Each reader must be assigned to a terminal location." />
                    </div>
                    <CardDescription>Payment terminal locations for accepting in-person payments at this site.</CardDescription>
                  </div>
                </div>
                <Button
                  size={tokens.button.card}
                  className={tokens.button.cardAction}
                  onClick={handleCreateTerminalLocation}
                  disabled={createTerminalLocation.isPending}
                >
                  {createTerminalLocation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tlLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className={tokens.loading.skeleton} />
                  ))}
                </div>
              ) : !terminalLocations || terminalLocations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No terminal locations yet. Create one to start pairing readers.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {terminalLocations.map((tl) => {
                    const locationReaders = readers?.filter((r) => r.location === tl.id) || [];
                    return (
                      <div
                        key={tl.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                      >
                        <div>
                          <p className="font-sans font-medium text-sm">{tl.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tl.address.line1}, {tl.address.city}, {tl.address.state} {tl.address.postal_code}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs">
                            {locationReaders.length} reader{locationReaders.length !== 1 ? 's' : ''}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteLocationTarget({ id: tl.id, name: tl.display_name })
                            }
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terminal Readers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <Smartphone className={tokens.card.icon} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className={tokens.card.title}>TERMINAL READERS</CardTitle>
                      <MetricInfoTooltip description="Physical card readers paired to this location. Online readers are connected and ready to accept payments. Offline readers may be powered off or disconnected." />
                    </div>
                    <CardDescription>Physical card readers paired to this location.</CardDescription>
                  </div>
                </div>
                <Button
                  size={tokens.button.card}
                  className={tokens.button.cardAction}
                  onClick={() => setRegisterOpen(true)}
                  disabled={!terminalLocations || terminalLocations.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Register Reader
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {readersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className={tokens.loading.skeleton} />
                  ))}
                </div>
              ) : !readers || readers.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {terminalLocations && terminalLocations.length > 0
                      ? 'No readers paired yet. Register a reader using its pairing code.'
                      : 'Create a terminal location first, then register readers.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...onlineReaders, ...offlineReaders].map((reader) => (
                    <div
                      key={reader.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {reader.status === 'online' ? (
                            <Wifi className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-sans font-medium text-sm">
                            {reader.label || reader.serial_number || reader.id}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{reader.device_type}</span>
                            {reader.serial_number && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{reader.serial_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={reader.status === 'online' ? 'default' : 'secondary'}
                          className={
                            reader.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
                              : ''
                          }
                        >
                          {reader.status === 'online' ? 'Online' : 'Offline'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteReaderTarget({
                              id: reader.id,
                              label: reader.label || reader.serial_number || reader.id,
                            })
                          }
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Offline Payment Status */}
      <OfflinePaymentStatus />

      {/* Purchase Terminal Card */}
      <TerminalPurchaseCard locations={locations} />

      {/* Register Reader Wizard */}
      <RegisterReaderDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        locationId={activeLocationId || ''}
        terminalLocations={(terminalLocations || []).map((tl) => ({
          id: tl.id,
          display_name: tl.display_name,
        }))}
      />

      {/* Delete Terminal Location Confirmation */}
      <AlertDialog
        open={!!deleteLocationTarget}
        onOpenChange={(o) => {
          if (!o && !isDeletingLocation) setDeleteLocationTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terminal Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteLocationTarget?.name}"? Any readers assigned to this
              location will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLocation}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteLocation}
              disabled={isDeletingLocation}
            >
              {isDeletingLocation && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reader Confirmation */}
      <AlertDialog
        open={!!deleteReaderTarget}
        onOpenChange={(o) => {
          if (!o && !isDeletingReader) setDeleteReaderTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Reader</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteReaderTarget?.label}"? This will unpair the device from
              your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingReader}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteReader}
              disabled={isDeletingReader}
            >
              {isDeletingReader && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
