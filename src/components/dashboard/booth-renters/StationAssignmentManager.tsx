import { useState } from 'react';
import { useRentalStations, useCreateStation, useUpdateStation, useDeleteStation, useAssignStation, useUnassignStation, RentalStation, CreateStationData } from '@/hooks/useRentalStations';
import { useBoothRenters } from '@/hooks/useBoothRenters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, UserPlus, UserMinus, Armchair } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface StationAssignmentManagerProps {
  organizationId: string;
  locationId?: string;
}

export function StationAssignmentManager({ organizationId, locationId }: StationAssignmentManagerProps) {
  const { data: stations, isLoading } = useRentalStations(organizationId, locationId);
  const { data: renters } = useBoothRenters(organizationId);
  const createStation = useCreateStation();
  const updateStation = useUpdateStation();
  const deleteStation = useDeleteStation();
  const assignStation = useAssignStation();
  const unassignStation = useUnassignStation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<RentalStation | null>(null);
  const [assigningStation, setAssigningStation] = useState<RentalStation | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<CreateStationData>({
    defaultValues: {
      organization_id: organizationId,
      location_id: locationId || '',
      station_type: 'chair',
    },
  });

  const stationType = watch('station_type');

  const onSubmit = async (data: CreateStationData) => {
    if (editingStation) {
      await updateStation.mutateAsync({ id: editingStation.id, ...data });
      setEditingStation(null);
    } else {
      await createStation.mutateAsync(data);
    }
    reset();
    setIsAddOpen(false);
  };

  const handleEdit = (station: RentalStation) => {
    setEditingStation(station);
    setValue('station_name', station.station_name);
    setValue('station_number', station.station_number || undefined);
    setValue('station_type', station.station_type);
    setValue('monthly_rate', station.monthly_rate || undefined);
    setValue('weekly_rate', station.weekly_rate || undefined);
    setValue('notes', station.notes || '');
    setIsAddOpen(true);
  };

  const handleDelete = async (stationId: string) => {
    if (confirm('Are you sure you want to delete this station?')) {
      await deleteStation.mutateAsync(stationId);
    }
  };

  const handleAssign = async (stationId: string, renterId: string) => {
    await assignStation.mutateAsync({ station_id: stationId, booth_renter_id: renterId });
    setAssigningStation(null);
  };

  const handleUnassign = async (stationId: string) => {
    if (confirm('Remove current assignment?')) {
      await unassignStation.mutateAsync(stationId);
    }
  };

  const getStationIcon = (type: string) => {
    switch (type) {
      case 'chair':
        return <Armchair className="h-6 w-6" />;
      case 'booth':
        return <div className="h-6 w-6 rounded border-2 border-current" />;
      case 'suite':
        return <div className="h-6 w-6 rounded-lg border-2 border-current" />;
      case 'room':
        return <div className="h-6 w-6 rounded-md bg-current opacity-30" />;
      default:
        return <Armchair className="h-6 w-6" />;
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  const availableRenters = renters?.filter(r => r.status === 'active') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Stations & Chairs</h3>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setEditingStation(null);
            reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button size={tokens.button.card}>
              <Plus className="h-4 w-4 mr-2" />
              Add Station
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStation ? 'Edit Station' : 'Add Station'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Station Name</Label>
                  <Input {...register('station_name', { required: true })} placeholder="Chair 1" />
                </div>
                <div className="space-y-2">
                  <Label>Station Number</Label>
                  <Input type="number" {...register('station_number', { valueAsNumber: true })} placeholder="1" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={stationType} onValueChange={(v) => setValue('station_type', v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chair">Chair</SelectItem>
                    <SelectItem value="booth">Booth</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rate</Label>
                  <Input type="number" step="0.01" {...register('monthly_rate', { valueAsNumber: true })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Weekly Rate</Label>
                  <Input type="number" step="0.01" {...register('weekly_rate', { valueAsNumber: true })} placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea {...register('notes')} placeholder="Additional details..." />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStation.isPending || updateStation.isPending}>
                  {editingStation ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stations?.map((station) => (
          <Card 
            key={station.id} 
            className={`relative ${station.current_assignment ? 'border-primary bg-primary/5' : 'border-dashed'}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStationIcon(station.station_type)}
                  <div>
                    <CardTitle className="text-sm">{station.station_name}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">{station.station_type}</p>
                  </div>
                </div>
                <Badge variant={station.is_available ? 'outline' : 'default'}>
                  {station.is_available ? 'Available' : 'Occupied'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {station.current_assignment ? (
                <div className="text-sm">
                  <p className="font-medium">{station.current_assignment.renter_name}</p>
                  {station.current_assignment.renter_business_name && (
                    <p className="text-muted-foreground text-xs">{station.current_assignment.renter_business_name}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}

              {station.monthly_rate && (
                <p className="text-xs text-muted-foreground">
                  ${station.monthly_rate}/mo
                </p>
              )}

              <div className="flex gap-1">
                {station.current_assignment ? (
                  <Button size={tokens.button.inline} variant="outline" className="flex-1" onClick={() => handleUnassign(station.id)}>
                    <UserMinus className="h-3 w-3 mr-1" />
                    Unassign
                  </Button>
                ) : (
                  <Dialog open={assigningStation?.id === station.id} onOpenChange={(open) => !open && setAssigningStation(null)}>
                    <DialogTrigger asChild>
                      <Button size={tokens.button.inline} variant="outline" className="flex-1" onClick={() => setAssigningStation(station)}>
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign {station.station_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {availableRenters.length === 0 ? (
                          <p className="text-muted-foreground">No active booth renters available</p>
                        ) : (
                          availableRenters.map((renter) => (
                            <Button
                              key={renter.id}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => handleAssign(station.id, renter.id)}
                            >
                              <span className="font-medium">{renter.display_name || renter.full_name}</span>
                              {renter.business_name && (
                                <span className="ml-2 text-muted-foreground">({renter.business_name})</span>
                              )}
                            </Button>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <Button size={tokens.button.inline} variant="ghost" onClick={() => handleEdit(station)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size={tokens.button.inline} variant="ghost" onClick={() => handleDelete(station.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!stations || stations.length === 0) && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Armchair className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No stations configured</p>
              <Button size={tokens.button.inline} variant="link" onClick={() => setIsAddOpen(true)}>
                Add your first station
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
