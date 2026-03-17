import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useLocations } from '@/hooks/useLocations';
import {
  useServiceLocationPrices,
  useUpsertServiceLocationPrices,
} from '@/hooks/useServiceLocationPricing';

interface LocationPricingContentProps {
  serviceId: string | null;
  basePrice: number | null;
  onSaved?: () => void;
}

export function LocationPricingContent({ serviceId, basePrice, onSaved }: LocationPricingContentProps) {
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: existingPrices = [], isLoading: pricesLoading } = useServiceLocationPrices(serviceId);
  const upsert = useUpsertServiceLocationPrices();

  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    locations.forEach(loc => {
      const existing = existingPrices.find(p => p.location_id === loc.id);
      map[loc.id] = existing ? String(existing.price) : '';
    });
    setPrices(map);
  }, [locations, existingPrices]);

  const handleSave = () => {
    if (!serviceId) return;
    const rows = Object.entries(prices)
      .filter(([, v]) => v.trim() !== '')
      .map(([locationId, v]) => ({
        service_id: serviceId,
        location_id: locationId,
        price: parseFloat(v),
      }))
      .filter(r => !isNaN(r.price));

    if (rows.length === 0) {
      onSaved?.();
      return;
    }

    upsert.mutate(rows, { onSuccess: () => onSaved?.() });
  };

  const isLoading = locationsLoading || pricesLoading;
  const activeLocations = locations.filter(l => l.is_active !== false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className={tokens.body.muted}>
        Set a location-specific price. Leave blank if no location-specific price applies.
      </p>
      <div className="space-y-3 max-h-[40vh] overflow-y-auto p-1">
        {activeLocations.map(loc => (
          <div key={loc.id} className="flex items-center gap-3">
            <Label className={cn(tokens.body.emphasis, 'w-36 shrink-0 truncate')}>
              {loc.name}
            </Label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7 rounded-lg"
                placeholder="0.00"
                value={prices[loc.id] || ''}
                onChange={e => setPrices(prev => ({ ...prev, [loc.id]: e.target.value }))}
                autoCapitalize="off"
              />
            </div>
          </div>
        ))}
        {activeLocations.length === 0 && (
          <p className={cn(tokens.body.muted, 'text-center py-4')}>No locations configured yet.</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Save Prices
        </Button>
      </div>
    </div>
  );
}
