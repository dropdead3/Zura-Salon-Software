import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Layers } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useStylistLevels, type StylistLevel } from '@/hooks/useStylistLevels';
import {
  useServiceLevelPrices,
  useUpsertServiceLevelPrices,
} from '@/hooks/useServiceLevelPricing';

interface LevelPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  serviceName: string;
  basePrice: number | null;
}

export function LevelPricingDialog({
  open, onOpenChange, serviceId, serviceName, basePrice,
}: LevelPricingDialogProps) {
  const { data: levels = [], isLoading: levelsLoading } = useStylistLevels();
  const { data: existingPrices = [], isLoading: pricesLoading } = useServiceLevelPrices(open ? serviceId : null);
  const upsert = useUpsertServiceLevelPrices();

  // Local state: levelId → price string
  const [prices, setPrices] = useState<Record<string, string>>({});

  // Seed local state when data loads
  useEffect(() => {
    if (!open) return;
    const map: Record<string, string> = {};
    levels.forEach(l => {
      const existing = existingPrices.find(p => p.stylist_level_id === l.id);
      map[l.id] = existing ? String(existing.price) : '';
    });
    setPrices(map);
  }, [open, levels, existingPrices]);

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
      onOpenChange(false);
      return;
    }

    upsert.mutate(rows, { onSuccess: () => onOpenChange(false) });
  };

  const isLoading = levelsLoading || pricesLoading;
  const activeLevels = levels.filter(l => l.is_active).sort((a, b) => a.display_order - b.display_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn(tokens.heading.card, 'flex items-center gap-2')}>
            <Layers className="w-4 h-4" /> Price by Stylist Level
          </DialogTitle>
          <DialogDescription className={tokens.body.muted}>
            Set pricing for <span className="font-medium text-foreground">{serviceName}</span> by level. Leave blank if no level-specific price applies.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <DashboardLoader size="sm" className="py-8" />
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto p-1">
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
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsert.isPending || isLoading}>
            {upsert.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Save Prices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
