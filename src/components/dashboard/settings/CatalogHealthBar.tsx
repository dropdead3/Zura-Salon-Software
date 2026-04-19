import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { AlertTriangle, X } from 'lucide-react';
import type { Service } from '@/hooks/useServicesData';
import type { ServiceCategoryColor } from '@/hooks/useServiceCategoryColors';
import type { ServiceVolumeEntry } from '@/hooks/useServiceBookingVolumes';

/**
 * Wave 15a — Catalog Health Bar
 *
 * Doctrine fit: rare, high-confidence, ranked structural defects surfaced
 * silently when material, hidden when clean (visibility contract). No new
 * queries — pure aggregation over data the parent already has.
 *
 * Each chip is a one-click filter onto the catalog so the operator can
 * triage the defect without scrolling. When `activeFilter` matches a chip,
 * the chip renders selected and offers an inline clear affordance.
 *
 * Chip suppression rule: a chip is omitted entirely when its count is 0.
 * If every chip is empty, the entire bar returns null.
 */
export type CatalogHealthFilter =
  | null
  | 'missing_cost'
  | 'low_margin'
  | 'empty_categories'
  | 'not_bookable'
  | 'missing_patch_test'
  | 'zombie';

interface Props {
  services: Service[];
  categories: ServiceCategoryColor[];
  volumes: Record<string, ServiceVolumeEntry> | undefined;
  activeFilter: CatalogHealthFilter;
  onFilterChange: (next: CatalogHealthFilter) => void;
}

export function CatalogHealthBar({
  services,
  categories,
  volumes,
  activeFilter,
  onFilterChange,
}: Props) {
  const stats = useMemo(() => {
    const missingCost = services.filter((s) => s.cost == null && (s.price ?? 0) > 0).length;
    const lowMargin = services.filter((s) => {
      if (s.cost == null || !s.price) return false;
      const m = ((s.price - s.cost) / s.price) * 100;
      return m < 30;
    }).length;
    const categoriesWithCounts = categories.map((c) => ({
      name: c.category_name,
      count: services.filter((s) => (s.category || 'Other') === c.category_name).length,
    }));
    const emptyCategories = categoriesWithCounts.filter((c) => c.count === 0).length;
    const notBookable = services.filter((s) => s.bookable_online === false).length;
    // Patch-test rule only applies when a service is flagged as chemical
    const missingPatchTest = services.filter(
      (s) => s.is_chemical_service && !s.patch_test_required,
    ).length;
    // Zombie: 0 bookings across the trailing 30d window. Only meaningful when
    // we actually have volume data — otherwise we'd false-positive every row.
    const zombie = volumes
      ? services.filter((s) => (volumes[s.id]?.count30d ?? 0) === 0).length
      : 0;
    return { missingCost, lowMargin, emptyCategories, notBookable, missingPatchTest, zombie };
  }, [services, categories, volumes]);

  const chips: Array<{ key: CatalogHealthFilter; label: string; count: number; tone: 'warn' | 'danger' | 'muted' }> = [
    { key: 'missing_cost', label: 'missing cost', count: stats.missingCost, tone: 'warn' },
    { key: 'low_margin', label: 'below 30% margin', count: stats.lowMargin, tone: 'danger' },
    { key: 'empty_categories', label: 'empty categor' + (stats.emptyCategories === 1 ? 'y' : 'ies'), count: stats.emptyCategories, tone: 'warn' },
    { key: 'not_bookable', label: 'not bookable online', count: stats.notBookable, tone: 'muted' },
    { key: 'missing_patch_test', label: 'missing patch-test rule', count: stats.missingPatchTest, tone: 'warn' },
    { key: 'zombie', label: 'zombie services (0 bookings 30d)', count: stats.zombie, tone: 'muted' },
  ].filter((c) => c.count > 0) as typeof chips;

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span className={cn(tokens.label.tiny, 'text-warning-foreground')}>CATALOG HEALTH</span>
        </div>
        {chips.map((chip) => {
          const isActive = activeFilter === chip.key;
          const toneClass =
            chip.tone === 'danger'
              ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
              : chip.tone === 'warn'
              ? 'border-warning/40 text-warning-foreground hover:bg-warning/10'
              : 'border-border text-muted-foreground hover:bg-muted/40';
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onFilterChange(isActive ? null : chip.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-xs font-sans font-medium transition-colors',
                toneClass,
                isActive && 'bg-foreground/10 ring-1 ring-foreground/20',
              )}
            >
              <span className="tabular-nums">{chip.count}</span>
              <span>{chip.label}</span>
              {isActive && <X className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
