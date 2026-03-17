import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  useBackroomStations,
  useCreateBackroomStation,
  useUpdateBackroomStation,
  useDeleteBackroomStation,
  getHealthColor,
  type BackroomStation,
} from '@/hooks/backroom/useBackroomStations';
import { useActiveLocations } from '@/hooks/useLocations';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PlatformCard, PlatformCardContent, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription } from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Monitor, Plus, Trash2, Pencil, Wand2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { StationHardwareWizard } from './StationHardwareWizard';

const HEALTH_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-destructive',
  gray: 'bg-[hsl(var(--platform-foreground-muted)/0.4)]',
};

interface Props {
  onNavigate?: (section: string) => void;
}

export function StationsHardwareSection({ onNavigate }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: stations, isLoading } = useBackroomStations();
  const { data: locations } = useActiveLocations();
  const createStation = useCreateBackroomStation();
  const updateStation = useUpdateBackroomStation();
  const deleteStation = useDeleteBackroomStation();

  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingStation, setEditingStation] = useState<BackroomStation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ station_name: '', location_id: '', assigned_device_id: '', assigned_scale_id: '' });

  const resetForm = () => {
    setForm({ station_name: '', location_id: '', assigned_device_id: '', assigned_scale_id: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!orgId || !form.station_name || !form.location_id) return;
    if (editingId) {
      updateStation.mutate({ id: editingId, station_name: form.station_name, assigned_device_id: form.assigned_device_id || null, assigned_scale_id: form.assigned_scale_id || null }, { onSuccess: resetForm });
    } else {
      createStation.mutate({ organization_id: orgId, location_id: form.location_id, station_name: form.station_name }, { onSuccess: resetForm });
    }
  };

  const handleEdit = (station: BackroomStation) => { setEditingStation(station); setShowWizard(true); };
  const handleWizardClose = () => { setShowWizard(false); setEditingStation(null); };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  if (showWizard) {
    return <div className="space-y-6"><StationHardwareWizard onClose={handleWizardClose} initialStation={editingStation ?? undefined} /></div>;
  }

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-stations-guide" title="Stations & Hardware" description="Register your physical mixing stations and optionally pair Bluetooth scales. Each station is tied to a location so Zura knows where mixing happens." icon={<Monitor className="h-4 w-4 text-primary" />} />
      <PlatformCard variant="default">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Monitor className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Mixing Stations</PlatformCardTitle>
              <PlatformCardDescription>Manage backroom mixing stations and connected hardware.</PlatformCardDescription>
            </div>
          </div>
          {!showForm && (
            <div className="flex items-center gap-2">
              <PlatformButton variant="default" size="sm" onClick={() => { setEditingStation(null); setShowWizard(true); }}>
                <Wand2 className="w-4 h-4 mr-1.5" /> Setup Station
              </PlatformButton>
              <PlatformButton variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Quick Add
              </PlatformButton>
            </div>
          )}
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          {showForm && (
            <div className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={tokens.label.default}>Station Name</label>
                  <PlatformInput value={form.station_name} onChange={(e) => setForm(f => ({ ...f, station_name: e.target.value }))} placeholder="e.g. Station 1" className="mt-1" />
                </div>
                <div>
                  <label className={tokens.label.default}>Location</label>
                  <Select value={form.location_id} onValueChange={(v) => setForm(f => ({ ...f, location_id: v }))} disabled={!!editingId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-1"><label className={tokens.label.default}>Device ID (optional)</label><MetricInfoTooltip description="Identifier for the tablet or device at this station (e.g. 'tablet-001')." /></div>
                  <PlatformInput value={form.assigned_device_id} onChange={(e) => setForm(f => ({ ...f, assigned_device_id: e.target.value }))} placeholder="e.g. tablet-001" className="mt-1" />
                </div>
                <div>
                  <div className="flex items-center gap-1"><label className={tokens.label.default}>Scale ID (optional)</label><MetricInfoTooltip description="Identifier for the Bluetooth scale paired to this station." /></div>
                  <PlatformInput value={form.assigned_scale_id} onChange={(e) => setForm(f => ({ ...f, assigned_scale_id: e.target.value }))} placeholder="e.g. scale-001" className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <PlatformButton variant="ghost" size="sm" onClick={resetForm}>Cancel</PlatformButton>
                <PlatformButton size="sm" onClick={handleSave} disabled={!form.station_name || !form.location_id}>{editingId ? 'Update' : 'Create'}</PlatformButton>
              </div>
            </div>
          )}

          {(!stations || stations.length === 0) && !showForm ? (
            <div className={tokens.empty.container}>
              <Monitor className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No stations configured</h3>
              <p className={tokens.empty.description}>Add your first mixing station to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stations?.map((station) => {
                const loc = locations?.find(l => l.id === station.location_id);
                const healthColor = getHealthColor(station.last_seen_at);
                const connType = station.connection_type ?? 'manual';
                const showHealth = connType !== 'manual';
                return (
                  <div key={station.id} className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Monitor className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
                        {showHealth && <span className={cn('absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[hsl(var(--platform-bg-card))]', HEALTH_DOT[healthColor])} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{station.station_name}</p>
                          {connType !== 'manual' && <PlatformBadge variant="outline" size="sm">{connType === 'ble' ? 'BLE' : 'Direct'}</PlatformBadge>}
                        </div>
                        <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                          {loc?.name || 'Unknown location'}
                          {station.device_name && ` · ${station.device_name}`}
                          {station.scale_model && ` · ${station.scale_model}`}
                          {showHealth && station.last_seen_at && <> · Last seen {formatDistanceToNow(new Date(station.last_seen_at), { addSuffix: true })}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PlatformBadge variant={station.is_active ? 'success' : 'default'}>{station.is_active ? 'Active' : 'Inactive'}</PlatformBadge>
                      <Switch checked={station.is_active} onCheckedChange={(checked) => updateStation.mutate({ id: station.id, is_active: checked })} />
                      <PlatformButton variant="ghost" size="icon-sm" onClick={() => handleEdit(station)}><Pencil className="w-4 h-4" /></PlatformButton>
                      <PlatformButton variant="ghost" size="icon-sm" onClick={() => deleteStation.mutate(station.id)}><Trash2 className="w-4 h-4 text-destructive" /></PlatformButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {onNavigate && stations && stations.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-[hsl(var(--platform-border)/0.3)]">
              <PlatformButton variant="ghost" size="sm" className="text-xs text-[hsl(var(--platform-foreground-muted))]" onClick={() => onNavigate('alerts')}>
                Next: Alerts & Exceptions <ArrowRight className="w-3 h-3 ml-1" />
              </PlatformButton>
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
