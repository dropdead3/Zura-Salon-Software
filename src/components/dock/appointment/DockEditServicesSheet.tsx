/**
 * DockEditServicesSheet — Dock-native bottom sheet for editing appointment services.
 * Category-first drill-down UI with iPad-sized touch targets.
 */

import { useState, useMemo } from 'react';
import { formatMinutesToDurationLong } from '@/lib/formatDuration';
import { Search, Clock, X, Check, Loader2, FlaskConical, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useServicesByCategory } from '@/hooks/usePhorestServices';
import type { PhorestService } from '@/hooks/usePhorestServices';
import type { ServiceEntry } from '@/hooks/useUpdateAppointmentServices';
import { cn } from '@/lib/utils';
import { DOCK_SHEET, DOCK_TEXT, DOCK_INPUT, DOCK_BUTTON } from '../dock-ui-tokens';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DEMO_SERVICES_BY_CATEGORY } from '@/hooks/dock/dockDemoData';

interface DockEditServicesSheetProps {
  open: boolean;
  onClose: () => void;
  currentServices: string[];
  locationId?: string;
  onSave: (services: ServiceEntry[]) => void;
  isSaving?: boolean;
}

export function DockEditServicesSheet({
  open,
  onClose,
  currentServices,
  locationId,
  onSave,
  isSaving,
}: DockEditServicesSheetProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, PhorestService>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { isDemoMode } = useDockDemo();
  const { data: realGrouped, isLoading } = useServicesByCategory(locationId);
  const grouped = isDemoMode && !locationId ? DEMO_SERVICES_BY_CATEGORY as unknown as Record<string, PhorestService[]> : realGrouped;
  const { formatCurrency } = useFormatCurrency();
  const dragControls = useDragControls();

  // Initialize selected from currentServices when sheet opens
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
    setSearch('');
    setActiveCategory(null);
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

  // Count selected services per category
  const selectedPerCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const svc of selected.values()) {
      const cat = svc.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [selected]);

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
    for (const svc of selected.values()) sum += svc.price ?? 0;
    return sum;
  }, [selected]);

  const totalDuration = useMemo(() => {
    let sum = 0;
    for (const svc of selected.values()) sum += svc.duration_minutes ?? 0;
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

  const isSearching = search.trim().length > 0;
  const showCategoryGrid = !isSearching && activeCategory === null;

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-40 flex flex-col">
          {/* Backdrop */}
          <motion.div
            className={cn(DOCK_SHEET.backdrop, 'flex-1 z-[60]')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={cn(DOCK_SHEET.panel, 'z-[61]')}
            style={{ maxHeight: DOCK_SHEET.maxHeight }}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={DOCK_SHEET.spring}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -DOCK_SHEET.dismissThreshold.offset || info.velocity.y < -DOCK_SHEET.dismissThreshold.velocity) {
                try { navigator.vibrate?.(15); } catch {}
                onClose();
              }
            }}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-7 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-violet-400" />
                  <h2 className={DOCK_TEXT.title}>Edit Services</h2>
                </div>
                <button onClick={onClose} className={DOCK_BUTTON.close}>
                  <X className={cn('w-5 h-5', DOCK_BUTTON.iconColor)} />
                </button>
              </div>
              <p className={cn(DOCK_TEXT.subtitle, 'mt-1')}>
                Add or remove services for this appointment
              </p>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 px-7 pb-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--platform-foreground-muted))]" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 text-base rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              </div>
            </div>

            {/* Selected chips — "On this appointment" */}
            {selected.size > 0 && (
              <div className="flex-shrink-0 px-7 pb-3">
                <p className={cn(DOCK_TEXT.category, 'mb-2')}>On This Appointment</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selected.values()).map(svc => (
                    <button
                      key={svc.name}
                      onClick={() => toggleService(svc)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-xl bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-destructive/20 transition-colors"
                    >
                      {svc.name}
                      <X className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Separator */}
            <div className="h-px bg-[hsl(var(--platform-border)/0.3)]" />

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-y-auto px-7 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--platform-foreground-muted))]" />
                </div>
              ) : showCategoryGrid ? (
                /* ── Category Grid ── */
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(filteredGroups).map(([category, services]) => {
                    const count = services.length;
                    const selectedCount = selectedPerCategory[category] || 0;
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className="relative flex flex-col items-start justify-between min-h-[88px] p-5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-left hover:bg-[hsl(var(--platform-bg-elevated))] transition-colors active:scale-[0.98]"
                      >
                        <span className="font-display text-base tracking-wider uppercase text-[hsl(var(--platform-foreground))]">
                          {category}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                            {count} service{count !== 1 ? 's' : ''}
                          </span>
                          {selectedCount > 0 && (
                            <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                              {selectedCount} selected
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ── Service List (drill-down or search) ── */
                <div className="space-y-1">
                  {/* Back button when drilling into a category */}
                  {activeCategory && !isSearching && (
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="flex items-center gap-2 mb-3 py-2 text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span className="font-display text-base tracking-wider uppercase text-[hsl(var(--platform-foreground))]">
                        {activeCategory}
                      </span>
                    </button>
                  )}

                  {(() => {
                    // Determine which services to show
                    const entries = isSearching
                      ? Object.entries(filteredGroups)
                      : activeCategory && filteredGroups[activeCategory]
                        ? [[activeCategory, filteredGroups[activeCategory]] as [string, PhorestService[]]]
                        : [];

                    if (entries.length === 0) {
                      return <p className={cn(DOCK_TEXT.subtitle, 'text-center py-8')}>No services found</p>;
                    }

                    return entries.map(([category, services]) => (
                      <div key={category}>
                        {/* Show category header only when searching across all */}
                        {isSearching && (
                          <p className={cn(DOCK_TEXT.category, 'mb-2 mt-3 first:mt-0')}>{category}</p>
                        )}
                        <div className="space-y-0.5">
                          {services.map(svc => {
                            const isSelected = selected.has(svc.name);
                            return (
                              <button
                                key={svc.id}
                                onClick={() => toggleService(svc)}
                                className={cn(
                                  'w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-colors',
                                  isSelected ? 'bg-violet-500/10' : 'hover:bg-[hsl(var(--platform-bg-card))]'
                                )}
                              >
                                <div className={cn(
                                  'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors',
                                  isSelected
                                    ? 'bg-violet-500 border-violet-500 text-white'
                                    : 'border-[hsl(var(--platform-border)/0.5)]'
                                )}>
                                  {isSelected && <Check className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-base text-[hsl(var(--platform-foreground))] truncate">{svc.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {svc.duration_minutes > 0 && (
                                      <span className="text-sm text-[hsl(var(--platform-foreground-muted))] flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {svc.duration_minutes}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {svc.price != null && svc.price > 0 && (
                                  <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                                    <BlurredAmount>{formatCurrency(svc.price)}</BlurredAmount>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-7 py-4 border-t border-[hsl(var(--platform-border)/0.2)] flex items-center justify-between">
              <div className="text-base text-[hsl(var(--platform-foreground-muted))]">
                {selected.size} service{selected.size !== 1 ? 's' : ''}
                {totalDuration > 0 && <span> · {formatMinutesToDurationLong(totalDuration)}</span>}
                {totalPrice > 0 && (
                  <span> · <BlurredAmount>{formatCurrency(totalPrice)}</BlurredAmount></span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={selected.size === 0 || isSaving}
                className={cn(
                  DOCK_BUTTON.primary,
                  'h-12 px-8 text-base font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />}
                Save Changes
              </button>
            </div>

            {/* Drag handle — bottom position for top-anchored sheet */}
            <div className={DOCK_SHEET.dragHandleWrapperBottom}>
              <div
                className={DOCK_SHEET.dragHandle}
                onPointerDown={(e) => dragControls.start(e)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
