import { Button } from '@/components/ui/button';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Clock, DollarSign, MapPin, Loader2, Scissors } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  phorest_service_id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
}

interface Location {
  id: string;
  name: string;
}

interface ServiceStepProps {
  locations: Location[];
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
  servicesByCategory: Record<string, Service[]> | undefined;
  allServices: Service[];
  selectedServices: string[];
  onToggleService: (serviceId: string) => void;
  totalDuration: number;
  totalPrice: number;
  onContinue: () => void;
  canContinue: boolean;
  isLoadingServices?: boolean;
}

export function ServiceStep({
  locations,
  selectedLocation,
  onLocationChange,
  servicesByCategory,
  allServices,
  selectedServices,
  onToggleService,
  totalDuration,
  totalPrice,
  onContinue,
  canContinue,
  isLoadingServices,
}: ServiceStepProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const hasServices = servicesByCategory && Object.keys(servicesByCategory).length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Location selector */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Location</span>
        </div>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="h-10 bg-muted/50 border-0">
            <SelectValue placeholder="Select a location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {!selectedLocation ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Select a location to view available services
            </div>
          ) : isLoadingServices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasServices ? (
            Object.entries(servicesByCategory).map(([category, services]) => (
              <div key={category}>
                <div className="bg-muted -mx-4 px-4 py-2 mb-2 border-y border-border/40">
                  <h3 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
                    {category}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {services.map((service) => {
                    const isSelected = selectedServices.includes(service.phorest_service_id);
                    return (
                      <button
                        key={service.id}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 ring-1 ring-primary/30'
                            : 'hover:bg-muted/70 active:bg-muted'
                        )}
                        onClick={() => onToggleService(service.phorest_service_id)}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-medium text-sm truncate">{service.name}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatMinutesToDuration(service.duration_minutes)}
                            </span>
                            {service.price !== null && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                {formatCurrencyWhole(service.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 space-y-2">
              <Scissors className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">No services synced yet</p>
              <p className="text-xs text-muted-foreground/70">
                Services will appear after syncing from Phorest
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer summary */}
      <div className="p-4 border-t border-border bg-card space-y-3">
        {selectedServices.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                </Badge>
                <span className="text-muted-foreground">{totalDuration} min</span>
              </div>
              <span className="font-medium">{formatCurrencyWhole(totalPrice)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {allServices
                .filter(s => selectedServices.includes(s.phorest_service_id))
                .map(s => (
                  <Badge key={s.id} variant="outline" className="text-xs font-normal">
                    {s.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}
        {selectedServices.length > 0 && (
          <Button
            variant="outline"
            className="w-full h-10"
            onClick={() => {
              const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
              scrollArea?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            + Add Another Service
          </Button>
        )}
        <Button
          className="w-full h-11"
          disabled={!canContinue}
          onClick={onContinue}
        >
          {selectedServices.length === 0 ? 'Skip Services' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
