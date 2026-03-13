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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Monitor, Plus, Trash2, Pencil, Wand2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { StationHardwareWizard } from './StationHardwareWizard';

const HEALTH_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-destructive',
  gray: 'bg-muted-foreground/40',
};

export function StationsHardwareSection() {
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
      updateStation.mutate({
        id: editingId,
        station_name: form.station_name,
        assigned_device_id: form.assigned_device_id || null,
        assigned_scale_id: form.assigned_scale_id || null,
      }, { onSuccess: resetForm });
    } else {
      createStation.mutate({
        organization_id: orgId,
        location_id: form.location_id,
        station_name: form.station_name,
      }, { onSuccess: resetForm });
    }
  };

  const handleEdit = (station: BackroomStation) => {
    // Open the full wizard in edit mode
    setEditingStation(station);
    setShowWizard(true);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setEditingStation(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (showWizard) {
    return (
      <div className="space-y-6">
        <StationHardwareWizard
          onClose={handleWizardClose}
          initialStation={editingStation ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Infotainer
        id="backroom-stations-guide"
        title="Stations & Hardware"
        description="Register your physical mixing stations and optionally pair Bluetooth scales. Each station is tied to a location so Zura knows where mixing happens."
        icon={<Monitor className="h-4 w-4 text-primary" />}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Monitor className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Mixing Stations</CardTitle>
              <CardDescription className={tokens.body.muted}>Manage backroom mixing stations and connected hardware.</CardDescription>
            </div>
          </div>
          {!showForm && (
            <div className="flex items-center gap-2">
              <Button size={tokens.button.card} className={tokens.button.cardAction} variant="default" onClick={() => { setEditingStation(null); setShowWizard(true); }}>
                <Wand2 className="w-4 h-4 mr-1.5" />
                Setup Station
              </Button>
              <Button size={tokens.button.card} className={tokens.button.cardAction} variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Quick Add
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className={cn(tokens.card.inner, 'p-4 space-y-3')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={tokens.label.default}>Station Name</label>
                  <Input value={form.station_name} onChange={(e) => setForm(f => ({ ...f, station_name: e.target.value }))} placeholder="e.g. Station 1" className="mt-1" />
                </div>
                <div>
                  <label className={tokens.label.default}>Location</label>
                  <Select value={form.location_id} onValueChange={(v) => setForm(f => ({ ...f, location_id: v }))} disabled={!!editingId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-1"><label className={tokens.label.default}>Device ID (optional)</label><MetricInfoTooltip description="Identifier for the tablet or device at this station (e.g. 'tablet-001')." /></div>
                  <Input value={form.assigned_device_id} onChange={(e) => setForm(f => ({ ...f, assigned_device_id: e.target.value }))} placeholder="e.g. tablet-001" className="mt-1" />
                </div>
                <div>
                  <div className="flex items-center gap-1"><label className={tokens.label.default}>Scale ID (optional)</label><MetricInfoTooltip description="Identifier for the Bluetooth scale paired to this station." /></div>
                  <Input value={form.assigned_scale_id} onChange={(e) => setForm(f => ({ ...f, assigned_scale_id: e.target.value }))} placeholder="e.g. scale-001" className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size={tokens.button.card} onClick={resetForm}>Cancel</Button>
                <Button size={tokens.button.card} onClick={handleSave} disabled={!form.station_name || !form.location_id}>
                  {editingId ? 'Update' : 'Create'}
                </Button>
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
                  <div key={station.id} className={cn(tokens.card.inner, 'p-4 flex items-center justify-between')}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        {showHealth && (
                          <span
                            className={cn(
                              'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-card',
                              HEALTH_DOT[healthColor]
                            )}
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={tokens.body.emphasis}>{station.station_name}</p>
                          {connType !== 'manual' && (
                            <Badge variant="outline" className="text-[10px]">
                              {connType === 'ble' ? 'BLE' : 'Direct'}
                            </Badge>
                          )}
                        </div>
                        <p className={tokens.body.muted}>
                          {loc?.name || 'Unknown location'}
                          {station.device_name && ` · ${station.device_name}`}
                          {station.scale_model && ` · ${station.scale_model}`}
                          {showHealth && station.last_seen_at && (
                            <> · Last seen {formatDistanceToNow(new Date(station.last_seen_at), { addSuffix: true })}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={station.is_active ? 'default' : 'secondary'}>{station.is_active ? 'Active' : 'Inactive'}</Badge>
                      <Switch
                        checked={station.is_active}
                        onCheckedChange={(checked) => updateStation.mutate({ id: station.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(station)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteStation.mutate(station.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
