import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, MapPin, Plus, Trash2, Wifi, WifiOff, Smartphone, Building2, Info, ExternalLink, RefreshCw, CheckCircle2, Zap, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalLocation {
  id: string;
  display_name: string;
  address: { line1: string; city: string; state: string; postal_code: string };
}

interface Reader {
  id: string;
  label: string;
  device_type: string;
  status: string;
  location: string;
  serial_number: string;
  device_sw_version?: string;
  ip_address?: string;
}

type LocationWithPayment = {
  id: string;
  name: string;
  stripe_account_id: string | null;
  stripe_status: string | null;
  stripe_payments_enabled: boolean | null;
  stripe_connect_status?: string | null;
  legal_name?: string | null;
};

function getConnectionStatus(loc: LocationWithPayment) {
  if (!loc.stripe_account_id) return { label: 'Not Connected', variant: 'outline' as const, dotClass: 'bg-muted-foreground/40' };
  if (loc.stripe_connect_status === 'pending') return { label: 'Pending', variant: 'secondary' as const, dotClass: 'bg-amber-500' };
  if (loc.stripe_status === 'active' && loc.stripe_payments_enabled) return { label: 'Active', variant: 'default' as const, dotClass: 'bg-emerald-500' };
  return { label: 'Pending', variant: 'secondary' as const, dotClass: 'bg-amber-500' };
}

function hasOwnAccount(loc: LocationWithPayment, orgAccountId: string | null): boolean {
  return !!loc.stripe_account_id && loc.stripe_account_id !== orgAccountId;
}

interface LocationSummaryRowProps {
  loc: LocationWithPayment;
  useTerminalLocations: (id: string | null) => { data: TerminalLocation[] | undefined; isLoading: boolean };
  useTerminalReaders: (id: string | null) => { data: Reader[] | undefined; isLoading: boolean };
  onSelect?: (locationId: string) => void;
}

function LocationSummaryRow({ loc, useTerminalLocations, useTerminalReaders, onSelect }: LocationSummaryRowProps) {
  const isConnected = !!loc.stripe_account_id;
  const { data: tlData, isLoading: tlLoading } = useTerminalLocations(isConnected ? loc.id : null);
  const { data: readerData, isLoading: readersLoading } = useTerminalReaders(isConnected ? loc.id : null);
  const status = getConnectionStatus(loc);

  if (isConnected && (tlLoading || readersLoading)) {
    return (
      <div className="grid grid-cols-5 gap-2 items-center px-3 py-3 rounded-lg bg-muted/30 border">
        <span className="font-sans font-medium text-sm truncate">{loc.name}</span>
        <div className="flex justify-center">
          <Badge variant={status.variant} className={cn(
            'text-[10px]',
            status.variant === 'default' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
          )}>{status.label}</Badge>
        </div>
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
    <div
      className="grid grid-cols-5 gap-2 items-center px-3 py-3 rounded-lg bg-muted/30 border cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSelect?.(loc.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(loc.id); }}
    >
      <div className="flex flex-col">
        <span className="font-sans font-medium text-sm truncate">{loc.name}</span>
        {hasOwnAccount(loc, null) && loc.legal_name && (
          <span className="text-[10px] text-muted-foreground truncate">{loc.legal_name}</span>
        )}
      </div>
      <div className="flex justify-center">
        <Badge variant={status.variant} className={cn(
          'text-[10px]',
          status.variant === 'default' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
        )}>{status.label}</Badge>
      </div>
      <span className="text-center text-sm text-muted-foreground">{isConnected ? (tlData?.length || 0) : '—'}</span>
      <span className="text-center text-sm text-muted-foreground">{isConnected ? readerList.length : '—'}</span>
      <div className="flex items-center justify-center gap-2">
        {!isConnected ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export interface ZuraPayFleetTabProps {
  locations: LocationWithPayment[];
  activeLocationId: string | null;
  showAllLocations: boolean;
  isLocationConnected: boolean;
  setShowAllLocations: (v: boolean) => void;
  setSelectedLocationId: (v: string | null) => void;
  terminalLocations: TerminalLocation[] | undefined;
  tlLoading: boolean;
  readers: Reader[] | undefined;
  readersLoading: boolean;
  onCreateTerminalLocation: () => void;
  createTerminalLocationPending: boolean;
  onDeleteLocation: (target: { id: string; name: string }) => void;
  onDeleteReader: (target: { id: string; label: string }) => void;
  onRegisterReader: () => void;
  useTerminalLocationsHook: (id: string | null) => { data: TerminalLocation[] | undefined; isLoading: boolean };
  useTerminalReadersHook: (id: string | null) => { data: Reader[] | undefined; isLoading: boolean };
  // Payment connect self-serve props
  orgConnectStatus?: string;
  orgConnectAccountId?: string | null;
  orgBankLast4?: string | null;
  onStartConnect?: () => void;
  isConnecting?: boolean;
  onVerifyConnection?: () => void;
  isVerifying?: boolean;
  onConnectLocation?: (locationId: string) => void;
  isConnectingLocation?: boolean;
  onResetAccount?: () => void;
  isResetting?: boolean;
  onDisconnectLocation?: (locationId: string) => void;
  isDisconnectingLocation?: boolean;
  onRefreshReaders?: () => void;
  onCreateLocationAccount?: (locationId: string) => void;
  isCreatingLocationAccount?: boolean;
}

export function ZuraPayFleetTab({
  locations,
  activeLocationId,
  showAllLocations,
  isLocationConnected,
  setShowAllLocations,
  setSelectedLocationId,
  terminalLocations,
  tlLoading,
  readers,
  readersLoading,
  onCreateTerminalLocation,
  createTerminalLocationPending,
  onDeleteLocation,
  onDeleteReader,
  onRegisterReader,
  useTerminalLocationsHook,
  useTerminalReadersHook,
  orgConnectStatus,
  orgConnectAccountId,
  orgBankLast4,
  onStartConnect,
  isConnecting,
  onVerifyConnection,
  isVerifying,
  onConnectLocation,
  isConnectingLocation,
  onResetAccount,
  isResetting,
  onDisconnectLocation,
  isDisconnectingLocation,
  onRefreshReaders,
  onCreateLocationAccount,
  isCreatingLocationAccount,
}: ZuraPayFleetTabProps) {
  const [showConfirmConnect, setShowConfirmConnect] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  const onlineReaders = readers?.filter((r) => r.status === 'online') || [];
  const offlineReaders = readers?.filter((r) => r.status !== 'online') || [];

  const selectedLoc = locations.find((l) => l.id === activeLocationId);
  const selectedStatus = selectedLoc ? getConnectionStatus(selectedLoc) : null;

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog — Start Setup */}
      <AlertDialog open={showConfirmConnect} onOpenChange={setShowConfirmConnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set up Zura Pay</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a payment account for your organization. You'll be redirected to a secure form to complete identity verification. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmConnect(false);
                onStartConnect?.();
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog — Reset Account */}
      <AlertDialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Zura Pay account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the current payment account and allow you to start the setup process over. This can only be done if no payments have been processed. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmReset(false);
                onResetAccount?.();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Confirmation Dialog — Disconnect Location */}
      <AlertDialog open={showConfirmDisconnect} onOpenChange={setShowConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect location from Zura Pay</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Zura Pay connection for this location. Terminal locations and readers will need to be reconfigured if you reconnect later. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDisconnect(false);
                if (activeLocationId) onDisconnectLocation?.(activeLocationId);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnectingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Location Picker / Label */}
      {locations.length === 1 ? (
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-sans font-medium text-sm">{locations[0].name}</span>
          {selectedStatus && (
            <Badge variant={selectedStatus.variant} className={cn(
              'text-xs',
              selectedStatus.variant === 'default' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
            )}>
              {selectedStatus.label}
            </Badge>
          )}
        </div>
      ) : locations.length > 1 && (
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
              {locations.map((loc) => {
                const status = getConnectionStatus(loc);
                return (
                  <SelectItem key={loc.id} value={loc.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.dotClass)} />
                      {loc.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {!showAllLocations && selectedStatus && (
            <Badge variant={selectedStatus.variant} className={cn(
              'text-xs',
              selectedStatus.variant === 'default' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
            )}>
              {selectedStatus.label}
            </Badge>
          )}
          {!showAllLocations && isLocationConnected && (
            <span className="text-xs text-muted-foreground">
              {readers?.length || 0} reader{(readers?.length || 0) !== 1 ? 's' : ''} at this location
            </span>
          )}
        </div>
      )}

      {/* All Locations Summary */}
      {showAllLocations ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Building2 className={tokens.card.icon} />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>FLEET OVERVIEW</CardTitle>
                <MetricInfoTooltip description="Summary of all terminal locations and readers across your organization. Locations must be connected to Zura Pay before they can manage terminals." />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 px-3 py-2 text-xs text-muted-foreground font-sans">
                <span>Location</span>
                <span className="text-center">Connection</span>
                <span className="text-center">Terminal Locations</span>
                <span className="text-center">Readers</span>
                <span className="text-center">Status</span>
              </div>
              {locations.map((loc) => (
                <LocationSummaryRow
                  key={loc.id}
                  loc={loc}
                  useTerminalLocations={useTerminalLocationsHook}
                  useTerminalReaders={useTerminalReadersHook}
                  onSelect={(id) => {
                    setShowAllLocations(false);
                    setSelectedLocationId(id);
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !isLocationConnected ? (
        /* Unconnected location — show self-serve connect flow */
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              {/* Org-level: no payment account connected */}
              {(!orgConnectStatus || orgConnectStatus === 'not_connected') ? (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-sm tracking-[0.14em]">CONNECT TO ZURA PAY</h3>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Set up in-person payment processing for your organization. You'll be guided through a secure verification process to enable payments.
                  </p>
                  <Button
                    onClick={() => setShowConfirmConnect(true)}
                    disabled={isConnecting}
                    className="mt-2"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Start Setup
                  </Button>
                </>
              ) : orgConnectStatus === 'pending' ? (
                /* Org account exists but not yet verified */
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                    <RefreshCw className="h-7 w-7 text-amber-500" />
                  </div>
                   <h3 className="font-display text-sm tracking-[0.14em]">VERIFICATION IN PROGRESS</h3>
                   <p className="mx-auto max-w-md text-sm text-muted-foreground">
                     Your account is being verified. This usually takes a few minutes. If you haven't completed the onboarding form, click below to continue.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      onClick={onVerifyConnection}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Check Status
                    </Button>
                    <Button
                      onClick={onStartConnect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Continue Onboarding
                    </Button>
                   </div>
                   <div className="mt-3">
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => setShowConfirmReset(true)}
                       disabled={isResetting}
                       className="text-xs text-muted-foreground hover:text-destructive"
                     >
                       {isResetting ? (
                         <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                       ) : (
                         <RotateCcw className="h-3 w-3 mr-1.5" />
                       )}
                       Reset &amp; Start Over
                     </Button>
                   </div>
                 </>
              ) : orgConnectStatus === 'active' ? (
                /* Org is verified but this specific location isn't connected */
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <h3 className="font-display text-sm tracking-[0.14em]">
                    ENABLE ZURA PAY FOR {selectedLoc?.name?.toUpperCase() || 'THIS LOCATION'}
                  </h3>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Your organization is verified and ready to accept payments. Select a preferred payout destination for this location.
                  </p>
                  <p className="text-xs font-display tracking-wide text-muted-foreground mt-1">SELECT PAYOUT DESTINATION</p>
                  <div className="flex flex-col items-center gap-3 mt-2">
                    <div className="flex flex-col items-center">
                      <Button
                        onClick={() => activeLocationId && onConnectLocation?.(activeLocationId)}
                        disabled={isConnectingLocation || !activeLocationId}
                      >
                        {isConnectingLocation ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        Use Organization Account
                      </Button>
                      {orgBankLast4 && (
                        <span className="text-xs text-muted-foreground mt-1">
                          Payouts for {selectedLoc.name} to account ending in ••{orgBankLast4}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-px w-8 bg-border" />
                      <span>or</span>
                      <span className="h-px w-8 bg-border" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => activeLocationId && onCreateLocationAccount?.(activeLocationId)}
                      disabled={isCreatingLocationAccount || !activeLocationId}
                    >
                      {isCreatingLocationAccount ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Building2 className="h-4 w-4 mr-2" />
                      )}
                      Connect Separate Account
                    </Button>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Use a separate account if this location operates under a different LLC or needs its own bank account for payouts.
                    </p>
                  </div>
                </>
              ) : (
                /* Fallback */
                <>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                    <Info className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-sm tracking-[0.14em]">LOCATION NOT CONNECTED</h3>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    This location is not yet connected to Zura Pay.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
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
                  onClick={onCreateTerminalLocation}
                  disabled={createTerminalLocationPending}
                >
                  {createTerminalLocationPending ? (
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
                      <div key={tl.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
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
                            onClick={() => onDeleteLocation({ id: tl.id, name: tl.display_name })}
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

          {/* Disconnect Location */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setShowConfirmDisconnect(true)}
            >
              Disconnect this location from Zura Pay
            </Button>
          </div>

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
                      <MetricInfoTooltip description="Physical card readers paired to this location. Online readers are connected and ready to accept payments." />
                    </div>
                    <CardDescription>Physical card readers paired to this location.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onRefreshReaders}
                    title="Refresh reader status"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size={tokens.button.card}
                    className={tokens.button.cardAction}
                    onClick={onRegisterReader}
                    disabled={!terminalLocations || terminalLocations.length === 0}
                  >
                  <Plus className="h-4 w-4" />
                  Register Reader
                </Button>
                </div>
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
                    <div key={reader.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
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
                            <span>{reader.device_type === 'stripe_s700' ? 'S700' : reader.device_type === 'stripe_s710' ? 'S710' : reader.device_type}</span>
                            {reader.serial_number && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{reader.serial_number}</span>
                              </>
                            )}
                          </div>
                          {(reader.device_sw_version || reader.ip_address) && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                              {reader.device_sw_version && <span>FW {reader.device_sw_version}</span>}
                              {reader.device_sw_version && reader.ip_address && <span>·</span>}
                              {reader.ip_address && <span className="font-mono">{reader.ip_address}</span>}
                            </div>
                          )}
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
                          onClick={() => onDeleteReader({
                            id: reader.id,
                            label: reader.label || reader.serial_number || reader.id,
                          })}
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
    </div>
  );
}
