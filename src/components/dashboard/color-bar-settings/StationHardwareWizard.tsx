/**
 * StationHardwareWizard — 4-step guided setup for connecting
 * mixing stations to iPads and Bluetooth scales.
 * Supports create (new) and edit (pre-filled) modes.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useActiveLocations } from '@/hooks/useLocations';
import {
  useCreateBackroomStation,
  useUpdateBackroomStation,
  type BackroomStation,
} from '@/hooks/backroom/useBackroomStations';
import { ScaleConnectionStatus } from '@/components/dashboard/backroom/ScaleConnectionStatus';
import type { ConnectionState } from '@/lib/backroom/weight-event-schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor,
  Bluetooth,
  Tablet,
  Weight,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Wifi,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';

type ConnectionType = 'ble' | 'direct';

interface WizardState {
  stationName: string;
  locationId: string;
  connectionType: ConnectionType | null;
  deviceName: string;
  scaleModel: string;
  pairingCode: string;
  useManualFallback: boolean;
}

const STEPS = [
  { label: 'Station', icon: Monitor },
  { label: 'Device', icon: Tablet },
  { label: 'Scale', icon: Weight },
  { label: 'Confirm', icon: Check },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

const slideTransition = {
  type: 'spring' as const,
  damping: 26,
  stiffness: 300,
  mass: 0.8,
};

function buildInitialState(station?: BackroomStation): WizardState {
  if (!station) {
    return {
      stationName: '',
      locationId: '',
      connectionType: null,
      deviceName: '',
      scaleModel: '',
      pairingCode: '',
      useManualFallback: false,
    };
  }
  const ct = station.connection_type as ConnectionType | null;
  return {
    stationName: station.station_name,
    locationId: station.location_id,
    connectionType: ct === 'ble' || ct === 'direct' ? ct : null,
    deviceName: station.device_name ?? '',
    scaleModel: station.scale_model ?? '',
    pairingCode: station.pairing_code ?? '',
    useManualFallback: station.connection_type === 'manual',
  };
}

interface Props {
  onClose: () => void;
  /** When provided, wizard opens in edit mode with fields pre-filled. */
  initialStation?: BackroomStation;
}

export function StationHardwareWizard({ onClose, initialStation }: Props) {
  const isEditMode = !!initialStation;
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations } = useActiveLocations();
  const createStation = useCreateBackroomStation();
  const updateStation = useUpdateBackroomStation();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<WizardState>(() => buildInitialState(initialStation));

  // BLE simulation state
  const [bleState, setBleState] = useState<ConnectionState>(() =>
    initialStation?.connection_type === 'ble' && initialStation?.pairing_code
      ? 'connected'
      : 'disconnected'
  );
  const [discoveredDevices, setDiscoveredDevices] = useState<{ name: string; id: string }[]>([]);
  const [selectedBleDevice, setSelectedBleDevice] = useState<string | null>(null);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // Simulated BLE scan
  const startBleScan = useCallback(() => {
    setBleState('scanning');
    setDiscoveredDevices([]);
    setSelectedBleDevice(null);

    setTimeout(() => {
      setDiscoveredDevices([
        { name: 'Precision Scale', id: 'scale-001' },
        { name: 'Ohaus Scout STX', id: 'ohaus-002' },
        { name: 'AWS LB-3000', id: 'aws-003' },
      ]);
      setBleState('disconnected');
    }, 2000);
  }, []);

  const pairBleDevice = useCallback((deviceId: string, deviceName: string) => {
    setSelectedBleDevice(deviceId);
    setBleState('pairing');
    setState((s) => ({ ...s, scaleModel: deviceName, pairingCode: deviceId }));

    setTimeout(() => {
      setBleState('connected');
    }, 1500);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!orgId || !state.stationName || !state.locationId) return;

    const hardwareFields = {
      connection_type: state.useManualFallback
        ? 'manual'
        : state.connectionType ?? 'manual',
      device_name: state.deviceName || undefined,
      scale_model: state.scaleModel || undefined,
      pairing_code: state.pairingCode || undefined,
    };

    if (isEditMode && initialStation) {
      updateStation.mutate(
        {
          id: initialStation.id,
          station_name: state.stationName,
          ...hardwareFields,
        },
        { onSuccess: onClose }
      );
    } else {
      createStation.mutate(
        {
          organization_id: orgId,
          location_id: state.locationId,
          station_name: state.stationName,
          ...hardwareFields,
        },
        { onSuccess: onClose }
      );
    }
  }, [orgId, state, isEditMode, initialStation, createStation, updateStation, onClose]);

  const isPending = createStation.isPending || updateStation.isPending;

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return !!state.stationName.trim() && !!state.locationId;
      case 1:
        return state.connectionType !== null &&
          (state.connectionType === 'ble' || !!state.deviceName.trim());
      case 2:
        return state.useManualFallback || bleState === 'connected' || !!state.pairingCode.trim();
      case 3:
        return true;
      default:
        return false;
    }
  };

  const locationName = locations?.find((l) => l.id === state.locationId)?.name ?? '—';

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={cn(
                  'text-xs font-sans hidden sm:inline',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px',
                    isDone ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
        >
          {step === 0 && (
            <StepStationIdentity
              state={state}
              setState={setState}
              locations={locations ?? []}
              isEditMode={isEditMode}
            />
          )}
          {step === 1 && (
            <StepDeviceAssignment state={state} setState={setState} />
          )}
          {step === 2 && (
            <StepScalePairing
              state={state}
              setState={setState}
              bleState={bleState}
              discoveredDevices={discoveredDevices}
              selectedBleDevice={selectedBleDevice}
              onStartScan={startBleScan}
              onPairDevice={pairBleDevice}
            />
          )}
          {step === 3 && (
            <StepConfirmation state={state} locationName={locationName} bleState={bleState} isEditMode={isEditMode} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={step === 0 ? onClose : goBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button size="sm" onClick={goNext} disabled={!canAdvance()}>
            Next
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isEditMode ? 'Update Station' : 'Create Station'}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Step 1: Station Identity ─── */
function StepStationIdentity({
  state,
  setState,
  locations,
  isEditMode,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  locations: { id: string; name: string }[];
  isEditMode: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className={tokens.heading.section}>Station Identity</h3>
          <p className={tokens.body.muted}>Name your station and assign it to a location.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className={tokens.label.default}>Station Name</label>
            <Input
              value={state.stationName}
              onChange={(e) => setState((s) => ({ ...s, stationName: e.target.value }))}
              placeholder="e.g. Color Bar 1"
              className="mt-1"
            />
          </div>
          <div>
            <label className={tokens.label.default}>Location</label>
            <Select
              value={state.locationId}
              onValueChange={(v) => setState((s) => ({ ...s, locationId: v }))}
              disabled={isEditMode}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditMode && (
              <p className={cn(tokens.body.muted, 'text-xs mt-1')}>Location cannot be changed after creation.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Step 2: Device Assignment ─── */
function StepDeviceAssignment({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const options: { type: ConnectionType; icon: typeof Bluetooth; title: string; desc: string }[] = [
    {
      type: 'ble',
      icon: Bluetooth,
      title: 'Bluetooth Scale',
      desc: 'Pair a BLE-enabled scale. We\'ll scan for nearby devices in the next step.',
    },
    {
      type: 'direct',
      icon: Tablet,
      title: 'Direct iPad Connection',
      desc: 'Connect an iPad running the Zura Backroom app via USB or local network.',
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className={tokens.heading.section}>Connection Method</h3>
          <p className={tokens.body.muted}>Choose how this station connects to a scale.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = state.connectionType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    connectionType: opt.type,
                    useManualFallback: false,
                  }))
                }
                className={cn(
                  'rounded-xl border p-5 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-foreground/20 hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={tokens.body.emphasis}>{opt.title}</span>
                </div>
                <p className={cn(tokens.body.muted, 'text-xs')}>{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {state.connectionType === 'direct' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className={tokens.label.default}>iPad Device Name</label>
              <Input
                value={state.deviceName}
                onChange={(e) => setState((s) => ({ ...s, deviceName: e.target.value }))}
                placeholder="e.g. Backroom iPad 1"
                className="mt-1"
              />
            </div>
            <div className={cn(tokens.card.inner, 'p-3')}>
              <p className={cn(tokens.body.muted, 'text-xs')}>
                Install the <span className="text-foreground font-medium">Zura Backroom</span> app
                on your iPad, then enter the device name shown in the app settings.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Step 3: Scale Pairing ─── */
function StepScalePairing({
  state,
  setState,
  bleState,
  discoveredDevices,
  selectedBleDevice,
  onStartScan,
  onPairDevice,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  bleState: ConnectionState;
  discoveredDevices: { name: string; id: string }[];
  selectedBleDevice: string | null;
  onStartScan: () => void;
  onPairDevice: (id: string, name: string) => void;
}) {
  const isBle = state.connectionType === 'ble';

  if (state.useManualFallback) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={tokens.heading.section}>Manual Mode</h3>
              <p className={tokens.body.muted}>Weight will be entered manually at this station.</p>
            </div>
            <ScaleConnectionStatus state="manual_override" />
          </div>
          <button
            onClick={() => setState((s) => ({ ...s, useManualFallback: false }))}
            className={cn(tokens.body.muted, 'underline text-xs hover:text-foreground transition-colors')}
          >
            Try connecting a scale instead
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={tokens.heading.section}>
              {isBle ? 'Pair Bluetooth Scale' : 'Connect Scale'}
            </h3>
            <p className={tokens.body.muted}>
              {isBle
                ? 'Scan for nearby BLE scales and pair.'
                : 'Enter the scale identifier shown in your iPad app.'}
            </p>
          </div>
          <ScaleConnectionStatus state={isBle ? bleState : (state.pairingCode ? 'connected' : 'disconnected')} />
        </div>

        {isBle ? (
          <div className="space-y-3">
            {bleState === 'disconnected' && discoveredDevices.length === 0 && (
              <Button variant="outline" size="sm" onClick={onStartScan}>
                <Bluetooth className="w-4 h-4 mr-1.5" />
                Scan for Scales
              </Button>
            )}

            {bleState === 'scanning' && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className={tokens.body.muted}>Scanning for nearby devices…</span>
              </div>
            )}

            {bleState === 'pairing' && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className={tokens.body.muted}>Pairing…</span>
              </div>
            )}

            {bleState === 'connected' && (
              <div className="flex items-center gap-3 py-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className={tokens.body.emphasis}>
                  Connected to {state.scaleModel}
                </span>
              </div>
            )}

            {discoveredDevices.length > 0 && bleState !== 'connected' && bleState !== 'pairing' && (
              <div className="space-y-2">
                <p className={tokens.label.tiny}>Discovered Devices</p>
                {discoveredDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onPairDevice(d.id, d.name)}
                    disabled={false}
                    className={cn(
                      tokens.card.inner,
                      'p-3 w-full flex items-center justify-between hover:bg-muted/80 transition-colors rounded-lg'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-muted-foreground" />
                      <span className={tokens.body.emphasis}>{d.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Pair</Badge>
                  </button>
                ))}
                <Button variant="outline" size="sm" onClick={onStartScan} className="mt-1">
                  Rescan
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={tokens.label.default}>Scale ID / Serial</label>
              <Input
                value={state.pairingCode}
                onChange={(e) => setState((s) => ({ ...s, pairingCode: e.target.value }))}
                placeholder="e.g. SCALE-001"
                className="mt-1"
              />
            </div>
            <div>
              <label className={tokens.label.default}>Scale Model (optional)</label>
              <Input
                value={state.scaleModel}
                onChange={(e) => setState((s) => ({ ...s, scaleModel: e.target.value }))}
                placeholder="e.g. Precision Scale"
                className="mt-1"
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setState((s) => ({ ...s, useManualFallback: true }))}
          className={cn(tokens.body.muted, 'underline text-xs hover:text-foreground transition-colors')}
        >
          Use manual entry instead
        </button>
      </CardContent>
    </Card>
  );
}

/* ─── Step 4: Confirmation ─── */
function StepConfirmation({
  state,
  locationName,
  bleState,
  isEditMode,
}: {
  state: WizardState;
  locationName: string;
  bleState: ConnectionState;
  isEditMode: boolean;
}) {
  const rows: { label: string; value: string; badge?: { text: string; variant: 'default' | 'outline' | 'secondary' } }[] = [
    { label: 'Station Name', value: state.stationName },
    { label: 'Location', value: locationName },
    {
      label: 'Connection',
      value: state.connectionType === 'ble' ? 'Bluetooth' : state.connectionType === 'direct' ? 'Direct iPad' : 'Manual',
      badge: state.connectionType === 'ble'
        ? { text: 'BLE', variant: 'default' }
        : state.connectionType === 'direct'
          ? { text: 'Direct', variant: 'secondary' }
          : { text: 'Manual', variant: 'outline' },
    },
  ];

  if (state.deviceName) rows.push({ label: 'Device', value: state.deviceName });
  if (state.scaleModel) rows.push({ label: 'Scale', value: state.scaleModel });
  if (state.useManualFallback) {
    rows.push({ label: 'Scale Mode', value: 'Manual Entry', badge: { text: 'Manual', variant: 'outline' } });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn(tokens.card.iconBox, 'bg-primary/10')}>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className={tokens.heading.section}>
              {isEditMode ? 'Review Changes' : 'Ready to Create'}
            </h3>
            <p className={tokens.body.muted}>
              {isEditMode ? 'Review your updated station configuration.' : 'Review your station configuration.'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3">
              <span className={tokens.body.muted}>{r.label}</span>
              <div className="flex items-center gap-2">
                <span className={tokens.body.emphasis}>{r.value}</span>
                {r.badge && <Badge variant={r.badge.variant} className="text-[10px]">{r.badge.text}</Badge>}
              </div>
            </div>
          ))}
        </div>

        {!state.useManualFallback && state.connectionType === 'ble' && (
          <div className="flex justify-end">
            <ScaleConnectionStatus state={bleState} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
