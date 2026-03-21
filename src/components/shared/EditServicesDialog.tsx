/**
 * EditServicesDialog — Category-grouped service picker for editing appointment services.
 * Supports `variant="dock"` for dark platform theme in the Zura Dock.
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
  variant?: 'default' | 'dock';
}

export function EditServicesDialog({
  open,
  onOpenChange,
  currentServices,
  locationId,
  onSave,
  isSaving,
  variant = 'default',
}: EditServicesDialogProps) {
  const isDock = variant === 'dock';
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
      <DialogContent className={cn(
        'max-w-md p-0 gap-0 max-h-[85vh] flex flex-col',
        isDock && 'bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))]'
      )}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className={cn(
            tokens.heading.subsection,
            isDock && 'text-[hsl(var(--platform-foreground))]'
          )}>Edit Services</DialogTitle>
          <DialogDescription className={cn(
            'text-sm',
            isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
          )}>
            Add or remove services for this appointment
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4',
              isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
            )} />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-full h-9 pl-9 pr-3 text-sm rounded-lg border focus:outline-none focus:ring-1',
                isDock
                  ? 'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:ring-violet-500/50'
                  : 'border-border bg-background focus:ring-ring'
              )}
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
                className={cn(
                  'gap-1 cursor-pointer',
                  isDock
                    ? 'bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-destructive/20'
                    : 'hover:bg-destructive/10'
                )}
                onClick={() => toggleService(svc)}
              >
                {svc.name}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        <Separator className={isDock ? 'bg-[hsl(var(--platform-border)/0.3)]' : undefined} />

        {/* Service list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-3 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={cn(
                  'h-5 w-5 animate-spin',
                  isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
                )} />
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <p className={cn(
                'text-sm text-center py-8',
                isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
              )}>No services found</p>
            ) : (
              Object.entries(filteredGroups).map(([category, services]) => (
                <div key={category}>
                  <p className={cn(
                    'text-xs font-display uppercase tracking-wider mb-2',
                    isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
                  )}>{category}</p>
                  <div className="space-y-0.5">
                    {services.map(svc => {
                      const isSelected = selected.has(svc.name);
                      return (
                        <button
                          key={svc.id}
                          onClick={() => toggleService(svc)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                            isDock
                              ? isSelected ? 'bg-violet-500/10' : 'hover:bg-[hsl(var(--platform-bg-card))]'
                              : isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                            isDock
                              ? isSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-[hsl(var(--platform-border)/0.5)]'
                              : isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm truncate',
                              isDock && 'text-[hsl(var(--platform-foreground))]'
                            )}>{svc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {svc.duration_minutes > 0 && (
                                <span className={cn(
                                  'text-xs flex items-center gap-0.5',
                                  isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
                                )}>
                                  <Clock className="h-3 w-3" />
                                  {svc.duration_minutes}m
                                </span>
                              )}
                            </div>
                          </div>
                          {svc.price != null && svc.price > 0 && (
                            <span className={cn(
                              'text-xs shrink-0',
                              isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
                            )}>
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

        <Separator className={isDock ? 'bg-[hsl(var(--platform-border)/0.3)]' : undefined} />

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className={cn(
            'text-sm',
            isDock ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-muted-foreground'
          )}>
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
            className={isDock ? 'bg-violet-500 hover:bg-violet-600 text-white rounded-full border-0' : undefined}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
