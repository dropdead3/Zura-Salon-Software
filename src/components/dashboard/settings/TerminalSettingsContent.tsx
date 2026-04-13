import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, MapPin, Plus, Trash2, Wifi, WifiOff, CreditCard, Smartphone } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useTerminalLocations, useTerminalReaders,
  useCreateTerminalLocation, useDeleteTerminalLocation,
  useRegisterReader, useDeleteReader,
} from '@/hooks/useStripeTerminals';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Skeleton } from '@/components/ui/skeleton';

// Fetch org locations that have Zura Pay (stripe_account_id)
function useZuraPayLocations() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['zura-pay-locations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, stripe_account_id, address_line1, city, state')
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
  const registerReader = useRegisterReader();

  const handleClose = () => {
    setStep(1);
    setSelectedTerminalLocation('');
    setRegistrationCode('');
    setReaderLabel('');
    onOpenChange(false);
  };

  const handleRegister = () => {
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
                onChange={(e) => setRegistrationCode(e.target.value)}
                className="font-mono text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Find this code on your terminal device screen during setup mode.
              </p>
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
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
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
  const { data: locations, isLoading: locationsLoading } = useZuraPayLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteReaderTarget, setDeleteReaderTarget] = useState<{ id: string; label: string } | null>(null);

  // Auto-select first location when loaded
  const activeLocationId = selectedLocationId || locations?.[0]?.id || null;

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
    deleteTerminalLocation.mutate(
      { locationId: activeLocationId, terminalLocationId: deleteLocationTarget.id },
      { onSuccess: () => setDeleteLocationTarget(null) }
    );
  };

  const handleDeleteReader = () => {
    if (!activeLocationId || !deleteReaderTarget) return;
    deleteReader.mutate(
      { locationId: activeLocationId, readerId: deleteReaderTarget.id },
      { onSuccess: () => setDeleteReaderTarget(null) }
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
            value={activeLocationId || ''}
            onValueChange={(v) => setSelectedLocationId(v)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  <span className="flex items-center gap-2">
                    {loc.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {readers?.length || 0} reader{(readers?.length || 0) !== 1 ? 's' : ''} at this location
          </span>
        </div>
      )}

      {/* Terminal Locations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <MapPin className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>TERMINAL LOCATIONS</CardTitle>
                <CardDescription>Stripe Terminal locations for accepting in-person payments at this site.</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleCreateTerminalLocation}
              disabled={createTerminalLocation.isPending}
              className="gap-1.5"
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
                <CardTitle className={tokens.card.title}>TERMINAL READERS</CardTitle>
                <CardDescription>Physical card readers paired to this location.</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setRegisterOpen(true)}
              disabled={!terminalLocations || terminalLocations.length === 0}
              className="gap-1.5"
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
              {/* Online readers first */}
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
        onOpenChange={(o) => !o && setDeleteLocationTarget(null)}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTerminalLocation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reader Confirmation */}
      <AlertDialog
        open={!!deleteReaderTarget}
        onOpenChange={(o) => !o && setDeleteReaderTarget(null)}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReader}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReader.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
