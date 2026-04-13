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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useTerminalLocations, useTerminalReaders,
  useCreateTerminalLocation, useDeleteTerminalLocation,
  useRegisterReader, useDeleteReader,
} from '@/hooks/useStripeTerminals';
import { useOrgConnectStatus, useConnectZuraPay, useVerifyZuraPayConnection, useConnectLocation } from '@/hooks/useZuraPayConnect';
import { useVerifyTerminalPayment } from '@/hooks/useTerminalHardwareOrder';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

import { ZuraPayFleetTab } from './terminal/ZuraPayFleetTab';
import { ZuraPayHardwareTab } from './terminal/ZuraPayHardwareTab';
import { ZuraPayConnectivityTab } from './terminal/ZuraPayConnectivityTab';
import { ZuraPayDisplayTab } from './terminal/ZuraPayDisplayTab';

// Fetch ALL org locations — connection status shown inline
function useZuraPayLocations() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['zura-pay-locations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, stripe_account_id, stripe_status, stripe_payments_enabled, address, city, state_province')
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
        returnUrl: `${window.location.origin}${window.location.pathname}?tab=terminals&zura_pay_return=true`,
        refreshUrl: `${window.location.origin}${window.location.pathname}?tab=terminals&zura_pay_refresh=true`,
      });
    }
  }, [orgId, searchParams, setSearchParams]);

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
        title="No Locations"
        description="Create at least one location in Location settings before configuring Zura Pay."
      />
    );
  }

  const selectedLocation = locations.find((l) => l.id === activeLocationId);
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
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <CreditCard className={tokens.card.icon} />
        </div>
        <div>
          <h2 className="font-display text-xl tracking-wide">ZURA PAY</h2>
          <p className="text-sm text-muted-foreground font-sans">In-person payment infrastructure for your locations.</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="fleet" className="font-sans">Fleet</TabsTrigger>
          <TabsTrigger value="hardware" className="font-sans">Hardware</TabsTrigger>
          <TabsTrigger value="connectivity" className="font-sans">Connectivity</TabsTrigger>
          <TabsTrigger value="display" className="font-sans">Display</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-6">
          <TabErrorBoundary tabName="Fleet">
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
                returnUrl: `${window.location.origin}${window.location.pathname}?tab=terminals&zura_pay_return=true`,
                refreshUrl: `${window.location.origin}${window.location.pathname}?tab=terminals&zura_pay_refresh=true`,
              })}
              isConnecting={connectMutation.isPending}
              onVerifyConnection={() => orgId && verifyMutation.mutate({ organizationId: orgId })}
              isVerifying={verifyMutation.isPending}
              onConnectLocation={(locationId) => orgId && connectLocationMutation.mutate({ organizationId: orgId, locationId })}
              isConnectingLocation={connectLocationMutation.isPending}
            />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="hardware" className="mt-6">
          <TabErrorBoundary tabName="Hardware">
            <ZuraPayHardwareTab locations={locations} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="connectivity" className="mt-6">
          <TabErrorBoundary tabName="Connectivity">
            <ZuraPayConnectivityTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="display" className="mt-6">
          <TabErrorBoundary tabName="Display">
            <ZuraPayDisplayTab businessName={selectedLocation?.name || locations?.[0]?.name || 'Your Salon'} />
          </TabErrorBoundary>
        </TabsContent>
      </Tabs>

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
