import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import {
  useServiceLevelPrices,
  useUpsertServiceLevelPrices,
} from '@/hooks/useServiceLevelPricing';

interface LevelPricingContentProps {
  serviceId: string | null;
  basePrice: number | null;
  onSaved?: () => void;
}

export function LevelPricingContent({ serviceId, basePrice, onSaved }: LevelPricingContentProps) {
  const { data: levels = [], isLoading: levelsLoading } = useStylistLevels();
  const { data: existingPrices = [], isLoading: pricesLoading } = useServiceLevelPrices(serviceId);
  const upsert = useUpsertServiceLevelPrices();

  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    levels.forEach(l => {
      const existing = existingPrices.find(p => p.stylist_level_id === l.id);
      map[l.id] = existing ? String(existing.price) : '';
    });
    setPrices(map);
  }, [levels, existingPrices]);

  const handleSave = () => {
    if (!serviceId) return;
    const rows = Object.entries(prices)
      .filter(([, v]) => v.trim() !== '')
      .map(([levelId, v]) => ({
        service_id: serviceId,
        stylist_level_id: levelId,
        price: parseFloat(v),
      }))
      .filter(r => !isNaN(r.price));

    if (rows.length === 0) {
      onSaved?.();
      return;
    }

    upsert.mutate(rows, { onSuccess: () => onSaved?.() });
  };

  const isLoading = levelsLoading || pricesLoading;
  const activeLevels = levels.filter(l => l.is_active).sort((a, b) => a.display_order - b.display_order);

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-8" />;
  }

  return (
    <div className="space-y-4">
      <p className={tokens.body.muted}>
        Set pricing by stylist level. Leave blank if no level-specific price applies.
      </p>
      <div className="space-y-3 max-h-[40vh] overflow-y-auto p-1">
        {activeLevels.map(level => (
          <div key={level.id} className="flex items-center gap-3">
            <Label className={cn(tokens.body.emphasis, 'w-36 shrink-0 truncate')}>
              {level.label}
            </Label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7 rounded-lg"
                placeholder="0.00"
                value={prices[level.id] || ''}
                onChange={e => setPrices(prev => ({ ...prev, [level.id]: e.target.value }))}
                autoCapitalize="off"
              />
            </div>
          </div>
        ))}
        {activeLevels.length === 0 && (
          <p className={cn(tokens.body.muted, 'text-center py-4')}>No stylist levels configured yet.</p>
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
