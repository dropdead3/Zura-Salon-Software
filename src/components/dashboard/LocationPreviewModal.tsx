import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocations, formatHoursForDisplay, getClosedDaysArray, type Location } from '@/hooks/useLocations';
import { MapPin, Phone, Clock, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface LocationPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Preview card that mimics the frontend LocationCard appearance
function LocationPreviewCard({ location }: { location: Location }) {
  const closedDays = getClosedDaysArray(location.hours_json);
  
  return (
    <div className="group relative bg-card border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl mb-1">{location.name}</h3>
            <p className="text-sm text-muted-foreground">{location.city}</p>
          </div>
          {location.store_number && (
            <span className="text-xs bg-muted px-2 py-1 rounded-full">
              #{location.store_number}
            </span>
          )}
        </div>
      </div>
      
      {/* Details */}
      <div className="px-6 pb-4 space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <p>{location.address}</p>
            <p className="text-muted-foreground">{location.city}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm">{location.phone}</p>
        </div>
        
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <p>{formatHoursForDisplay(location.hours_json) || location.hours || 'Hours not set'}</p>
            {closedDays.length > 0 && (
              <p className="text-muted-foreground text-xs mt-0.5">
                Closed {closedDays.join(' & ')}
              </p>
            )}
          </div>
        </div>
        
        {location.holiday_closures && location.holiday_closures.length > 0 && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              {location.holiday_closures.length} upcoming closure{location.holiday_closures.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="px-6 pb-6 pt-2 flex gap-2">
        <Button size={tokens.button.card} className="flex-1 gap-2">
          Book Now
          <ExternalLink className="w-3 h-3" />
        </Button>
        <Button size={tokens.button.card} variant="outline" className="gap-2">
          <MapPin className="w-3 h-3" />
          Directions
        </Button>
      </div>
    </div>
  );
}

export function LocationPreviewModal({ open, onOpenChange }: LocationPreviewModalProps) {
  const { data: locations = [] } = useLocations();
  
  // Filter to only show locations marked for website display
  const websiteLocations = locations.filter(loc => loc.is_active && loc.show_on_website);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Website Locations Preview</DialogTitle>
          <p className="text-sm text-muted-foreground">
            This is how your locations will appear on the public website
          </p>
        </DialogHeader>
        
        {websiteLocations.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No locations are set to show on the website</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enable "Show on website" for locations you want to display
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 py-4">
            {websiteLocations.map((location) => (
              <LocationPreviewCard key={location.id} location={location} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
