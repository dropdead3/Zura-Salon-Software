import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomStations, useCreateBackroomStation, useUpdateBackroomStation, useDeleteBackroomStation } from '@/hooks/backroom/useBackroomStations';
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
import { format } from 'date-fns';
import { StationHardwareWizard } from './StationHardwareWizard';

export function StationsHardwareSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: stations, isLoading } = useBackroomStations();
  const { data: locations } = useActiveLocations();
  const createStation = useCreateBackroomStation();
  const updateStation = useUpdateBackroomStation();
  const deleteStation = useDeleteBackroomStation();

  const [showForm, setShowForm] = useState(false);
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

  const handleEdit = (station: any) => {
    setForm({
      station_name: station.station_name,
      location_id: station.location_id,
      assigned_device_id: station.assigned_device_id || '',
      assigned_scale_id: station.assigned_scale_id || '',
    });
    setEditingId(station.id);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <Button size={tokens.button.card} className={tokens.button.cardAction} variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Station
            </Button>
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
                  <label className={tokens.label.default}>Device ID (optional)</label>
                  <Input value={form.assigned_device_id} onChange={(e) => setForm(f => ({ ...f, assigned_device_id: e.target.value }))} placeholder="e.g. tablet-001" className="mt-1" />
                </div>
                <div>
                  <label className={tokens.label.default}>Scale ID (optional)</label>
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
                return (
                  <div key={station.id} className={cn(tokens.card.inner, 'p-4 flex items-center justify-between')}>
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className={tokens.body.emphasis}>{station.station_name}</p>
                        <p className={tokens.body.muted}>
                          {loc?.name || 'Unknown location'}
                          {station.assigned_device_id && ` · Device: ${station.assigned_device_id}`}
                          {station.assigned_scale_id && ` · Scale: ${station.assigned_scale_id}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {station.last_seen_at && (
                        <span className={tokens.body.muted}>Last seen {format(new Date(station.last_seen_at), 'MMM d, h:mm a')}</span>
                      )}
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
