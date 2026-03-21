/**
 * EditServicesDialog — Category-grouped service picker for editing appointment services.
 * Fetches from phorest_services, shows checkboxes, search, price/duration per service.
 */

import { useState, useMemo } from 'react';
import { Search, Clock, X, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
const useCurrencyFormatter = () => {
  const fc = useFormatCurrency();
  return fc.formatCurrency;
};
import { useServicesByCategory } from '@/hooks/usePhorestServices';
import type { PhorestService } from '@/hooks/usePhorestServices';
import type { ServiceEntry } from '@/hooks/useUpdateAppointmentServices';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface EditServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentServices: string[];
  locationId?: string;
  onSave: (services: ServiceEntry[]) => void;
  isSaving?: boolean;
}

export function EditServicesDialog({
  open,
  onOpenChange,
  currentServices,
  locationId,
  onSave,
  isSaving,
}: EditServicesDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, PhorestService>>(new Map());
  const { data: grouped, isLoading } = useServicesByCategory(locationId);
  const { formatCurrency } = useFormatCurrency();

  // Initialize selected from currentServices when dialog opens
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized && grouped) {
    const map = new Map<string, PhorestService>();
    for (const services of Object.values(grouped)) {
      for (const svc of services) {
        if (currentServices.includes(svc.name)) {
          map.set(svc.name, svc);
        }
      }
    }
    setSelected(map);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const filteredGroups = useMemo(() => {
    if (!grouped) return {};
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, PhorestService[]> = {};
    for (const [cat, services] of Object.entries(grouped)) {
      const filtered = services.filter(s => s.name.toLowerCase().includes(q));
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [grouped, search]);

  const toggleService = (svc: PhorestService) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(svc.name)) {
        next.delete(svc.name);
      } else {
        next.set(svc.name, svc);
      }
      return next;
    });
  };

  const totalPrice = useMemo(() => {
    let sum = 0;
    for (const svc of selected.values()) {
      sum += svc.price ?? 0;
    }
    return sum;
  }, [selected]);

  const totalDuration = useMemo(() => {
    let sum = 0;
    for (const svc of selected.values()) {
      sum += svc.duration_minutes ?? 0;
    }
    return sum;
  }, [selected]);

  const handleSave = () => {
    const services: ServiceEntry[] = Array.from(selected.values()).map(s => ({
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      category: s.category,
    }));
    onSave(services);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className={tokens.heading.subsection}>Edit Services</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add or remove services for this appointment
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Selected chips */}
        {selected.size > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {Array.from(selected.values()).map(svc => (
              <Badge
                key={svc.name}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => toggleService(svc)}
              >
                {svc.name}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Service list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-3 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No services found</p>
            ) : (
              Object.entries(filteredGroups).map(([category, services]) => (
                <div key={category}>
                  <p className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">{category}</p>
                  <div className="space-y-0.5">
                    {services.map(svc => {
                      const isSelected = selected.has(svc.name);
                      return (
                        <button
                          key={svc.id}
                          onClick={() => toggleService(svc)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{svc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {svc.duration_minutes > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {svc.duration_minutes}m
                                </span>
                              )}
                            </div>
                          </div>
                          {svc.price != null && svc.price > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              <BlurredAmount>{formatCurrency(svc.price)}</BlurredAmount>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selected.size} service{selected.size !== 1 ? 's' : ''}
            {totalDuration > 0 && <span> · {totalDuration}m</span>}
            {totalPrice > 0 && (
              <span> · <BlurredAmount>{formatCurrency(totalPrice)}</BlurredAmount></span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={selected.size === 0 || isSaving}
            size="sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
