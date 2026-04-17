import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useServicesData, type Service } from '@/hooks/useServicesData';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string | null;
  locationId?: string | null;
  /** Called with the resolved service + price (location override applied if present). */
  onAdd: (input: {
    serviceId: string;
    name: string;
    unitPrice: number;
    priceSource: 'location-override' | 'catalog' | 'unset';
  }) => void;
}

export function AddServiceDialog({
  open,
  onOpenChange,
  organizationId,
  locationId,
  onAdd,
}: AddServiceDialogProps) {
  const [search, setSearch] = useState('');
  const { data: services = [] } = useServicesData(undefined, organizationId ?? undefined);
  const { formatCurrency } = useFormatCurrency();

  // Pull all location-price overrides for this location in one shot
  const { data: locationPrices = [] } = useQuery({
    queryKey: ['service-location-prices-for-location', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_location_prices')
        .select('service_id, price')
        .eq('location_id', locationId!);
      if (error) throw error;
      return data as { service_id: string; price: number }[];
    },
    enabled: !!locationId && open,
  });

  const priceOverrideMap = useMemo(() => {
    const m = new Map<string, number>();
    locationPrices.forEach((p) => m.set(p.service_id, p.price));
    return m;
  }, [locationPrices]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Service[]>();
    services.forEach((s) => {
      const cat = s.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [services]);

  const handleSelect = (service: Service) => {
    const override = priceOverrideMap.get(service.id);
    const unitPrice = override ?? service.price ?? 0;
    const priceSource: 'location-override' | 'catalog' | 'unset' =
      override != null ? 'location-override' : service.price != null ? 'catalog' : 'unset';
    onAdd({
      serviceId: service.id,
      name: service.name,
      unitPrice,
      priceSource,
    });
    onOpenChange(false);
    setSearch('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search services to add…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No services found.</CommandEmpty>
        {grouped.map(([category, items]) => (
          <CommandGroup key={category} heading={category}>
            {items.map((service) => {
              const override = priceOverrideMap.get(service.id);
              const displayPrice = override ?? service.price;
              return (
                <CommandItem
                  key={service.id}
                  value={`${service.name} ${category}`}
                  onSelect={() => handleSelect(service)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{service.name}</span>
                    {service.duration_minutes && (
                      <span className="text-xs text-muted-foreground">
                        {service.duration_minutes} min
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {override != null && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Local
                      </span>
                    )}
                    <span className="font-medium tabular-nums">
                      {displayPrice != null ? formatCurrency(displayPrice) : '—'}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
