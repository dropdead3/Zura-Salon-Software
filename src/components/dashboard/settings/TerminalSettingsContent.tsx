import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tokens } from '@/lib/design-tokens';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, CreditCard, Smartphone, Wifi } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useTerminalLocations, useTerminalReaders,
  useCreateTerminalLocation, useDeleteTerminalLocation,
  useRegisterReader, useDeleteReader,
} from '@/hooks/useStripeTerminals';
import { useOrgConnectStatus, useOrgBankLast4, useConnectZuraPay, useVerifyZuraPayConnection, useConnectLocation, useResetZuraPayAccount, useDisconnectLocation, useCreateLocationAccount } from '@/hooks/useZuraPayConnect';
import { useVerifyTerminalPayment } from '@/hooks/useTerminalHardwareOrder';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { useSearchParams } from 'react-router-dom';

import { ZuraPayFleetTab } from './terminal/ZuraPayFleetTab';
import { ZuraPayHardwareTab } from './terminal/ZuraPayHardwareTab';
import { ZuraPayConnectivityTab } from './terminal/ZuraPayConnectivityTab';
import { ZuraPayDisplayTab } from './terminal/ZuraPayDisplayTab';
import { ZuraPayActivationChecklist } from './terminal/ZuraPayActivationChecklist';
import { ZuraPayReceiptsTab } from './terminal/ZuraPayReceiptsTab';
import { ZuraPayTippingTab } from './terminal/ZuraPayTippingTab';


// Lightweight error boundary for individual tabs
class TabErrorBoundary extends React.Component<
  { tabName: string; children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error(`[ZuraPay ${this.props.tabName}] render error`, error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center space-y-3">
          <p className="font-display text-sm tracking-wide text-muted-foreground">
            {this.props.tabName} tab encountered an error
          </p>
          <p className="text-xs text-muted-foreground">{this.state.error?.message}</p>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: undefined })}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fetch ALL org locations — connection status shown inline
function useZuraPayLocations() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['zura-pay-locations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, stripe_account_id, stripe_status, stripe_payments_enabled, stripe_connect_status, address, city, state_province, legal_name')
        .eq('organization_id', orgId!);
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
        onSuccess: () => setStep(3),
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
                        <SelectItem key={tl.id} value={tl.id}>{tl.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={() => setStep(2)} disabled={!selectedTerminalLocation}>Next</Button>
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

// ---- Main Terminal Settings Content ----

export function TerminalSettingsContent() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations, isLoading: locationsLoading } = useZuraPayLocations();
  const { data: connectStatus } = useOrgConnectStatus(orgId);
  const { data: bankLast4, isLoading: bankLast4Loading, isError: bankLast4Error } = useOrgBankLast4(orgId, connectStatus?.stripe_connect_account_id);
  const queryClient = useQueryClient();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteReaderTarget, setDeleteReaderTarget] = useState<{ id: string; label: string } | null>(null);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [isDeletingReader, setIsDeletingReader] = useState(false);

  const connectMutation = useConnectZuraPay();
  const verifyMutation = useVerifyZuraPayConnection();
  const verifyPayment = useVerifyTerminalPayment();
  const connectLocationMutation = useConnectLocation();
  const resetAccountMutation = useResetZuraPayAccount();
  const disconnectLocationMutation = useDisconnectLocation();
  const createLocationAccountMutation = useCreateLocationAccount();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('subtab') || 'fleet');

  // Sync activeTab to URL for bookmark/refresh persistence
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'fleet') { newParams.delete('subtab'); } else { newParams.set('subtab', tab); }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const verifyMutateRef = useRef(verifyMutation.mutate);
  verifyMutateRef.current = verifyMutation.mutate;

  const connectMutateRef = useRef(connectMutation.mutate);
  connectMutateRef.current = connectMutation.mutate;

  const verifyPaymentRef = useRef(verifyPayment.mutate);
  verifyPaymentRef.current = verifyPayment.mutate;

  // Handle return from payment onboarding AND hardware checkout — idempotency guard prevents double-fire
  const hasVerifiedReturn = useRef(false);
  useEffect(() => {
    const isReturn = searchParams.get('zura_pay_return') === 'true';
    const isRefresh = searchParams.get('zura_pay_refresh') === 'true';
    const checkoutStatus = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (!orgId) return;
    if (!isReturn && !isRefresh && checkoutStatus !== 'success') return;
    if (hasVerifiedReturn.current) return;
    hasVerifiedReturn.current = true;

    // Clean up URL params
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('zura_pay_return');
    newParams.delete('zura_pay_refresh');
    newParams.delete('checkout');
    newParams.delete('session_id');
    setSearchParams(newParams, { replace: true });

    if (checkoutStatus === 'success' && sessionId) {
      // Hardware checkout return — switch to Hardware tab and verify
      setActiveTab('hardware');
      verifyPaymentRef.current({ sessionId, organizationId: orgId });
    } else if (isReturn) {
      verifyMutateRef.current({ organizationId: orgId });
    } else if (isRefresh) {
      // Session expired — re-initiate onboarding automatically
      connectMutateRef.current({
        organizationId: orgId,
        returnUrl: `${window.location.origin}${window.location.pathname}?category=terminals&zura_pay_return=true`,
        refreshUrl: `${window.location.origin}${window.location.pathname}?category=terminals&zura_pay_refresh=true`,
      });
    }
  }, [orgId, searchParams, setSearchParams]);

  // G3: Auto-select location after onboarding return
  useEffect(() => {
    const autoId = verifyMutation.data?.auto_connected_location_id;
    if (autoId) {
      setSelectedLocationId(autoId);
      setShowAllLocations(false);
    }
  }, [verifyMutation.data?.auto_connected_location_id]);

  const activeLocationId = showAllLocations ? null : (selectedLocationId || locations?.[0]?.id || null);
  const activeLocation = locations?.find((l) => l.id === activeLocationId);
  const connectedLocationId = activeLocation?.stripe_account_id ? activeLocationId : null;

  const { data: terminalLocations, isLoading: tlLoading } = useTerminalLocations(connectedLocationId);
  const { data: readers, isLoading: readersLoading } = useTerminalReaders(connectedLocationId);
  const createTerminalLocation = useCreateTerminalLocation();
  const deleteTerminalLocation = useDeleteTerminalLocation();
  const deleteReader = useDeleteReader();

  // Auto-create terminal location when a connected location has none
  const autoCreateFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!connectedLocationId) return;
    if (tlLoading) return;
    if (terminalLocations && terminalLocations.length > 0) return;
    if (createTerminalLocation.isPending) return;
    // Only fire once per location to prevent loops
    if (autoCreateFiredRef.current === connectedLocationId) return;
    autoCreateFiredRef.current = connectedLocationId;
    createTerminalLocation.mutate({
      locationId: connectedLocationId,
      displayName: activeLocation?.name,
    });
  }, [connectedLocationId, tlLoading, terminalLocations, createTerminalLocation, activeLocation?.name]);

  // Check if org has processed at least one terminal payment
  const { data: hasFirstTransaction } = useQuery({
    queryKey: ['zura-pay-first-transaction', orgId, activeLocationId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .not('paid_at', 'is', null)
        .eq('payment_method', 'terminal')
        .limit(1);
      if (activeLocationId) {
        query = query.eq('location_id', activeLocationId);
      }
      const { count, error } = await query;
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!orgId,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  if (locationsLoading) {
    return <DashboardLoader size="md" className="h-64" />;
  }

  if (!locations || locations.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No Locations"
        description="Create at least one location in Location settings before configuring Zura Pay."
      />
    );
  }

  const selectedLocation = activeLocation;
  const isLocationConnected = !!selectedLocation?.stripe_account_id;

  const handleCreateTerminalLocation = () => {
    if (!activeLocationId || !isLocationConnected) return;
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
        onSuccess: () => { setDeleteLocationTarget(null); setIsDeletingLocation(false); },
        onError: () => { setIsDeletingLocation(false); },
      }
    );
  };

  const handleDeleteReader = () => {
    if (!activeLocationId || !deleteReaderTarget) return;
    setIsDeletingReader(true);
    deleteReader.mutate(
      { locationId: activeLocationId, readerId: deleteReaderTarget.id },
      {
        onSuccess: () => { setDeleteReaderTarget(null); setIsDeletingReader(false); },
        onError: () => { setIsDeletingReader(false); },
      }
    );
  };

  const affectedReaderCount = deleteLocationTarget
    ? (readers?.filter((r) => r.location === deleteLocationTarget.id).length || 0)
    : 0;

  return (
    <div className="space-y-6">

      {/* Page Explainer */}
      <PageExplainer pageId="zura-pay-config" />

      {/* Activation Checklist */}
      <ZuraPayActivationChecklist
        connectStatus={connectStatus?.stripe_connect_status}
        detailsSubmitted={connectStatus?.stripe_connect_status === 'active'}
        isLocationConnected={isLocationConnected}
        hasTerminalLocations={(terminalLocations?.length ?? 0) > 0}
        hasReaders={(readers?.length ?? 0) > 0}
        hasFirstTransaction={hasFirstTransaction}
        locationHasOwnAccount={
          !!activeLocation?.stripe_account_id &&
          activeLocation.stripe_account_id !== connectStatus?.stripe_connect_account_id
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="fleet" className="font-sans">Fleet</TabsTrigger>
          <TabsTrigger value="hardware" className="font-sans">Hardware</TabsTrigger>
          <TabsTrigger value="connectivity" className="font-sans">Connectivity</TabsTrigger>
          <TabsTrigger value="display" className="font-sans">Display</TabsTrigger>
          <TabsTrigger value="tipping" className="font-sans">Tipping</TabsTrigger>
          <TabsTrigger value="receipts" className="font-sans">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-6">
          <TabErrorBoundary tabName="Fleet" key={activeTab === 'fleet' ? 'fleet-active' : 'fleet'}>
            <ZuraPayFleetTab
              locations={locations}
              activeLocationId={activeLocationId}
              showAllLocations={showAllLocations}
              isLocationConnected={isLocationConnected}
              setShowAllLocations={setShowAllLocations}
              setSelectedLocationId={setSelectedLocationId}
              terminalLocations={terminalLocations}
              tlLoading={tlLoading}
              readers={readers}
              readersLoading={readersLoading}
              onCreateTerminalLocation={handleCreateTerminalLocation}
              createTerminalLocationPending={createTerminalLocation.isPending}
              onDeleteLocation={setDeleteLocationTarget}
              onDeleteReader={setDeleteReaderTarget}
              onRegisterReader={() => setRegisterOpen(true)}
              useTerminalLocationsHook={useTerminalLocations}
              useTerminalReadersHook={useTerminalReaders}
              orgConnectStatus={connectStatus?.stripe_connect_status}
              onStartConnect={() => orgId && connectMutation.mutate({
                organizationId: orgId,
                returnUrl: `${window.location.origin}${window.location.pathname}?category=terminals&zura_pay_return=true`,
                refreshUrl: `${window.location.origin}${window.location.pathname}?category=terminals&zura_pay_refresh=true`,
              })}
              isConnecting={connectMutation.isPending}
              onVerifyConnection={() => orgId && verifyMutation.mutate({ organizationId: orgId })}
              isVerifying={verifyMutation.isPending}
              onConnectLocation={(locationId) => orgId && connectLocationMutation.mutate({ organizationId: orgId, locationId })}
              isConnectingLocation={connectLocationMutation.isPending}
              onResetAccount={() => orgId && resetAccountMutation.mutate({ organizationId: orgId })}
              isResetting={resetAccountMutation.isPending}
              onDisconnectLocation={(locationId) => orgId && disconnectLocationMutation.mutate({ organizationId: orgId, locationId })}
              isDisconnectingLocation={disconnectLocationMutation.isPending}
              orgConnectAccountId={connectStatus?.stripe_connect_account_id}
              orgBankLast4={bankLast4 ?? verifyMutation.data?.bank_last4 ?? null}
              orgBankLast4Loading={bankLast4Loading}
              orgBankLast4Error={bankLast4Error}
              onCreateLocationAccount={(locationId) => orgId && createLocationAccountMutation.mutate({
                organizationId: orgId,
                locationId,
                returnUrl: `${window.location.origin}${window.location.pathname}?category=terminals&zura_pay_return=true`,
                refreshUrl: `${window.location.origin}${window.location.pathname}?category=terminals&zura_pay_refresh=true`,
              })}
              isCreatingLocationAccount={createLocationAccountMutation.isPending}
              onRefreshReaders={() => {
                queryClient.invalidateQueries({ queryKey: ['terminal-readers'] });
              }}
            />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="hardware" className="mt-6">
          <TabErrorBoundary tabName="Hardware" key={activeTab === 'hardware' ? 'hardware-active' : 'hardware'}>
            <ZuraPayHardwareTab locations={locations} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="connectivity" className="mt-6">
          <TabErrorBoundary tabName="Connectivity" key={activeTab === 'connectivity' ? 'connectivity-active' : 'connectivity'}>
            <ZuraPayConnectivityTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="display" className="mt-6">
          <TabErrorBoundary tabName="Display" key={activeTab === 'display' ? 'display-active' : 'display'}>
            <ZuraPayDisplayTab businessName={selectedLocation?.name || locations?.[0]?.name || 'Your Salon'} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="tipping" className="mt-6">
          <TabErrorBoundary tabName="Tipping" key={activeTab === 'tipping' ? 'tipping-active' : 'tipping'}>
            <ZuraPayTippingTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="receipts" className="mt-6">
          <TabErrorBoundary tabName="Receipts" key={activeTab === 'receipts' ? 'receipts-active' : 'receipts'}>
            <ZuraPayReceiptsTab />
          </TabErrorBoundary>
        </TabsContent>

      </Tabs>

      {/* Register Reader Wizard — guarded against empty locationId */}
      {activeLocationId && (
        <RegisterReaderDialog
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          locationId={activeLocationId}
          terminalLocations={(terminalLocations || []).map((tl) => ({
            id: tl.id,
            display_name: tl.display_name,
          }))}
        />
      )}

      {/* Delete Terminal Location Confirmation */}
      <AlertDialog
        open={!!deleteLocationTarget}
        onOpenChange={(o) => { if (!o && !isDeletingLocation) setDeleteLocationTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terminal Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteLocationTarget?.name}"?
              {affectedReaderCount > 0
                ? ` This location has ${affectedReaderCount} reader${affectedReaderCount !== 1 ? 's' : ''} that will need to be reassigned.`
                : ' Any readers assigned to this location will need to be reassigned.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLocation}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteLocation} disabled={isDeletingLocation}>
              {isDeletingLocation && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reader Confirmation */}
      <AlertDialog
        open={!!deleteReaderTarget}
        onOpenChange={(o) => { if (!o && !isDeletingReader) setDeleteReaderTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Reader</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteReaderTarget?.label}"? This will unpair the device from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingReader}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteReader} disabled={isDeletingReader}>
              {isDeletingReader && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
