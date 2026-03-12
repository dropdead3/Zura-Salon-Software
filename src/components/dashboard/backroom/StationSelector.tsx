/**
 * StationSelector — Pick or create a backroom station.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBackroomStations } from '@/hooks/backroom/useBackroomStations';

interface StationSelectorProps {
  locationId?: string;
  value: string | null;
  onValueChange: (stationId: string | null) => void;
}

export function StationSelector({ locationId, value, onValueChange }: StationSelectorProps) {
  const { data: stations = [], isLoading } = useBackroomStations(locationId);

  if (isLoading) {
    return <div className="h-10 bg-muted/30 animate-pulse rounded-md" />;
  }

  if (stations.length === 0) {
    return (
      <p className="font-sans text-xs text-muted-foreground">
        No stations configured for this location
      </p>
    );
  }

  return (
    <Select value={value ?? ''} onValueChange={(v) => onValueChange(v || null)}>
      <SelectTrigger className="h-10 font-sans">
        <SelectValue placeholder="Select station (optional)" />
      </SelectTrigger>
      <SelectContent>
        {stations.map((station) => (
          <SelectItem key={station.id} value={station.id}>
            {station.station_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
