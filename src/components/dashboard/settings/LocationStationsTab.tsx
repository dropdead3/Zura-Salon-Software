import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  useRentalStations,
  useCreateStation,
  useUpdateStation,
  useDeleteStation,
  type RentalStation,
} from '@/hooks/useRentalStations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface LocationStationsTabProps {
  locationId: string;
}

export function LocationStationsTab({ locationId }: LocationStationsTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: stations = [], isLoading } = useRentalStations(orgId, locationId);
  const createStation = useCreateStation();
  const updateStation = useUpdateStation();
  const deleteStation = useDeleteStation();

  const [bulkCount, setBulkCount] = useState(1);

  const handleBulkAdd = async () => {
    if (!orgId || bulkCount < 1) return;
    const existingNumbers = stations.map(s => s.station_number ?? 0);
    const startNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    const promises = Array.from({ length: bulkCount }, (_, i) => {
      const num = startNumber + i;
      return createStation.mutateAsync({
        organization_id: orgId,
        location_id: locationId,
        station_name: `Station ${num}`,
        station_number: num,
        station_type: 'chair',
      });
    });

    try {
      await Promise.all(promises);
      toast.success(`Added ${bulkCount} station${bulkCount > 1 ? 's' : ''}`);
      setBulkCount(1);
    } catch {
      // Individual errors handled by hook
    }
  };

  const handleToggleAvailability = (station: RentalStation) => {
    updateStation.mutate({ id: station.id, is_available: !station.is_available });
  };

  const handleDelete = (stationId: string) => {
    deleteStation.mutate(stationId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className={tokens.body.muted}>
          {stations.length} station{stations.length !== 1 ? 's' : ''} configured
        </p>
      </div>

      {/* Quick Add */}
      <div className="space-y-2">
        <Label>Quick Add Stations</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={20}
            value={bulkCount}
            onChange={(e) => setBulkCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-20"
            autoCapitalize="off"
          />
          <Button
            size="sm"
            onClick={handleBulkAdd}
            disabled={createStation.isPending}
            className="gap-2"
          >
            {createStation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add {bulkCount > 1 ? `${bulkCount} Stations` : 'Station'}
          </Button>
        </div>
      </div>

      {/* Station List */}
      {stations.length === 0 ? (
        <div className={tokens.empty.container}>
          <p className={tokens.empty.description}>
            No stations yet. Add stations above to enable chair assignments.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {stations.map((station) => (
            <div
              key={station.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors',
                !station.is_available && 'opacity-60'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn(tokens.body.emphasis, 'text-sm')}>
                  {station.station_name}
                </span>
                {station.station_number != null && (
                  <span className={cn(tokens.body.muted, 'text-xs')}>
                    #{station.station_number}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={cn(tokens.body.muted, 'text-xs')}>Available</span>
                  <Switch
                    checked={station.is_available}
                    onCheckedChange={() => handleToggleAvailability(station)}
                  />
                </div>
                <button
                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                  onClick={() => handleDelete(station.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
