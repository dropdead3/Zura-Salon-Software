import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { CheckCircle2, AlertTriangle, Circle, X } from 'lucide-react';
import type { Service } from '@/hooks/useServicesData';
import type { ServiceCategoryColor } from '@/hooks/useServiceCategoryColors';

/**
 * Wave 16a — Catalog Setup Checklist
 *
 * Reframe of Wave 15a's CatalogHealthBar from analytical → structural.
 * This is a CONFIGURATOR surface. Items here describe **what's required
 * for downstream surfaces (booking, scheduling, payroll) to function** —
 * not what's analytically interesting.
 *
 * Visibility contract: defective items render as filterable warning chips;
 * satisfied requirements render as quiet ✓ confirmations so the operator
 * can tell what's "done." Optional items (not yet wired) are rendered as
 * neutral ○ to signal "not configured but not blocking."
 *
 * Removed from Wave 15a: low_margin, zombie (analytical signals — wrong frame).
 * Kept: missing_cost, missing_patch_test, not_bookable, empty_categories.
 * Added: missing_duration (blocks scheduling), missing_price (blocks checkout).
 */
export type CatalogSetupFilter =
  | null
  | 'missing_cost'
  | 'missing_duration'
  | 'missing_price'
  | 'empty_categories'
  | 'not_bookable'
  | 'missing_patch_test';

interface Props {
  services: Service[];
  categories: ServiceCategoryColor[];
  activeFilter: CatalogSetupFilter;
  onFilterChange: (next: CatalogSetupFilter) => void;
}

interface ChecklistItem {
  key: CatalogSetupFilter;
  label: string;
  count: number;
  total: number;
  // 'required' = blocks a downstream surface. 'recommended' = should be set.
  severity: 'required' | 'recommended';
  // Plain-language consequence — answers "what breaks if I don't fix this?"
  consequence: string;
}

export function CatalogSetupChecklist({
  services,
  categories,
  activeFilter,
  onFilterChange,
}: Props) {
  const items = useMemo<ChecklistItem[]>(() => {
    const total = services.length;
    const missingPrice = services.filter((s) => s.price == null || s.price <= 0).length;
    const missingDuration = services.filter(
      (s) => !s.duration_minutes || s.duration_minutes <= 0,
    ).length;
    const missingCost = services.filter(
      (s) => s.cost == null && (s.price ?? 0) > 0,
    ).length;
    const notBookable = services.filter((s) => s.bookable_online === false).length;
    const missingPatchTest = services.filter(
      (s) => s.is_chemical_service && !s.patch_test_required,
    ).length;
    const emptyCategories = categories.filter(
      (c) => services.filter((s) => (s.category || 'Other') === c.category_name).length === 0,
    ).length;

    return [
      {
        key: 'missing_price',
        label: 'missing price',
        count: missingPrice,
        total,
        severity: 'required',
        consequence: 'blocks checkout',
      },
      {
        key: 'missing_duration',
        label: 'missing duration',
        count: missingDuration,
        total,
        severity: 'required',
        consequence: 'blocks scheduling',
      },
      {
        key: 'missing_cost',
        label: 'missing cost',
        count: missingCost,
        total,
        severity: 'recommended',
        consequence: 'breaks margin reporting',
      },
      {
        key: 'missing_patch_test',
        label: 'chemical services missing patch-test rule',
        count: missingPatchTest,
        total,
        severity: 'required',
        consequence: 'compliance risk',
      },
      {
        key: 'not_bookable',
        label: 'not bookable online',
        count: notBookable,
        total,
        severity: 'recommended',
        consequence: 'hidden from public booking',
      },
      {
        key: 'empty_categories',
        label: 'empty categor' + (emptyCategories === 1 ? 'y' : 'ies'),
        count: emptyCategories,
        total: categories.length,
        severity: 'recommended',
        consequence: 'clutters category navigation',
      },
    ];
  }, [services, categories]);

  // If catalog is empty, no checklist makes sense yet.
  if (services.length === 0) return null;

  const requiredOpen = items.filter((i) => i.severity === 'required' && i.count > 0);
  const recommendedOpen = items.filter((i) => i.severity === 'recommended' && i.count > 0);
  const totalOpen = requiredOpen.length + recommendedOpen.length;

  // When the entire checklist is satisfied, render a slim confirmation row
  // rather than disappearing — the operator deserves the "done" signal on a
  // configurator surface (it's earned reassurance, not noise).
  if (totalOpen === 0) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className={cn(tokens.label.tiny, 'text-success-foreground')}>CATALOG SETUP</span>
        <span className={cn(tokens.body.muted)}>
          All structural requirements satisfied · {services.length} service
          {services.length === 1 ? '' : 's'} ready
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
        <span className={cn(tokens.label.tiny)}>CATALOG SETUP</span>
        <span className={cn(tokens.body.muted, 'text-xs')}>
          {requiredOpen.length > 0
            ? `${requiredOpen.reduce((a, b) => a + b.count, 0)} required fix${
                requiredOpen.reduce((a, b) => a + b.count, 0) === 1 ? '' : 'es'
              }`
            : `${recommendedOpen.length} recommendation${recommendedOpen.length === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {[...requiredOpen, ...recommendedOpen].map((item) => {
          const isActive = activeFilter === item.key;
          const isRequired = item.severity === 'required';
          const Icon = isRequired ? AlertTriangle : Circle;
          const toneClass = isRequired
            ? 'border-warning/40 text-warning-foreground hover:bg-warning/10'
            : 'border-border text-muted-foreground hover:bg-muted/40';
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onFilterChange(isActive ? null : item.key)}
              title={`${item.consequence}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-xs font-sans font-medium transition-colors',
                toneClass,
                isActive && 'bg-foreground/10 ring-1 ring-foreground/20',
              )}
            >
              <Icon className={cn('w-3 h-3', isRequired ? 'text-warning' : 'text-muted-foreground')} />
              <span className="tabular-nums">{item.count}</span>
              <span>{item.label}</span>
              <span className="text-muted-foreground/70">→ {item.consequence}</span>
              {isActive && <X className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
