import { MapPin, DollarSign, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDayRateEnabledLocations } from '@/hooks/useDayRateAvailability';
import { useDayRateChairs } from '@/hooks/useDayRateChairs';

interface LocationWithDayRate {
  id: string;
  name: string;
  address: string;
  city: string;
  day_rate_default_price: number | null;
}

interface LocationStepProps {
  selectedLocationId?: string;
  onSelect: (location: LocationWithDayRate) => void;
}

export function LocationStep({ selectedLocationId, onSelect }: LocationStepProps) {
  const { data: locations, isLoading } = useDayRateEnabledLocations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No Locations Available</h3>
        <p className="text-muted-foreground text-sm">
          Day rate booking is not currently available at any locations.
          Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm text-center mb-6">
        Select a salon location for your day rate booking
      </p>
      
      {locations.map(location => (
        <LocationCard
          key={location.id}
          location={location as LocationWithDayRate}
          isSelected={selectedLocationId === location.id}
          onSelect={() => onSelect(location as LocationWithDayRate)}
        />
      ))}
    </div>
  );
}

function LocationCard({ 
  location, 
  isSelected, 
  onSelect 
}: { 
  location: LocationWithDayRate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: chairs } = useDayRateChairs(location.id);
  const availableChairCount = chairs?.filter(c => c.is_available).length || 0;

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
        isSelected 
          ? 'border-primary ring-2 ring-primary ring-offset-2' 
          : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{location.name}</h3>
            {isSelected && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>{location.address}, {location.city}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">
                ${location.day_rate_default_price || 150}/day
              </span>
            </div>
            <span className="text-muted-foreground">
              {availableChairCount} chair{availableChairCount !== 1 ? 's' : ''} available
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
