import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Plus, Check, X, Users, UserPlus } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn, formatDisplayName } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  useStylistPriceOverrides,
  useUpsertStylistPriceOverride,
  useDeleteStylistPriceOverride,
  type StylistPriceOverride,
} from '@/hooks/useServiceLevelPricing';
import { useServiceLevelPrices } from '@/hooks/useServiceLevelPricing';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface StylistOverridesContentProps {
  serviceId: string | null;
  basePrice: number | null;
}

interface EmployeeRow {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string;
  stylist_level: string | null;
  photo_url: string | null;
}

interface LevelRow {
  id: string;
  slug: string;
  label: string;
}

function humanize(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatLevel(stylistLevel: string | null, levels: LevelRow[]): { number: number | null; label: string } {
  if (!stylistLevel) return { number: null, label: 'Unassigned' };
  const idx = levels.findIndex(l => l.slug === stylistLevel || l.label === stylistLevel);
  if (idx === -1) {
    // Try parse "LEVEL N STYLIST"
    const m = stylistLevel.match(/LEVEL\s*(\d+)/i);
    if (m) return { number: parseInt(m[1], 10), label: humanize(stylistLevel.replace(/LEVEL\s*\d+\s*/i, '').trim()) || 'Stylist' };
    return { number: null, label: humanize(stylistLevel) };
  }
  return { number: idx + 1, label: levels[idx].label || humanize(levels[idx].slug) };
}

export function StylistOverridesContent({ serviceId, basePrice }: StylistOverridesContentProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { formatCurrencyTwoDecimal } = useFormatCurrency();

  const { data: overrides = [], isLoading: overridesLoading } = useStylistPriceOverrides(serviceId);
  const { data: levelPrices = [] } = useServiceLevelPrices(serviceId);
  const { data: levels = [] } = useStylistLevels();
  const upsertOverride = useUpsertStylistPriceOverride();
  const deleteOverride = useDeleteStylistPriceOverride();

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-overrides', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('id, user_id, display_name, full_name, stylist_level, photo_url')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true);
      if (error) throw error;
      return data as unknown as EmployeeRow[];
    },
    enabled: !!orgId,
  });

  const [search, setSearch] = useState('');
  const [addingEmployeeId, setAddingEmployeeId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});

  const overrideMap = useMemo(() => {
    const m: Record<string, StylistPriceOverride> = {};
    overrides.forEach(o => { m[o.employee_id] = o; });
    return m;
  }, [overrides]);

  const overriddenEmployees = useMemo(() =>
    employees.filter(e => overrideMap[e.id]),
  [employees, overrideMap]);

  const availableEmployees = useMemo(() => {
    const q = search.toLowerCase().trim();
    return employees
      .filter(e => !overrideMap[e.id])
      .filter(e => {
        if (!q) return true;
        const name = (e.display_name || e.full_name || '').toLowerCase();
        const lvl = formatLevel(e.stylist_level, levels as LevelRow[]);
        const lvlText = `${lvl.number ? `l${lvl.number}` : ''} ${lvl.label}`.toLowerCase();
        return name.includes(q) || lvlText.includes(q);
      });
  }, [employees, overrideMap, search, levels]);

  const getLevelPrice = (stylistLevel: string | null): number | null => {
    if (!stylistLevel) return null;
    const level = (levels as LevelRow[]).find(l => l.label === stylistLevel || l.slug === stylistLevel);
    if (!level) return null;
    const lp = levelPrices.find(p => p.stylist_level_id === level.id);
    return lp ? lp.price : null;
  };

  const handleAddOverride = () => {
    if (!addingEmployeeId || !serviceId || !newPrice.trim()) return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;
    upsertOverride.mutate(
      { service_id: serviceId, employee_id: addingEmployeeId, price },
      { onSuccess: () => { setAddingEmployeeId(null); setNewPrice(''); } }
    );
  };

  const handleUpdateOverride = (override: StylistPriceOverride) => {
    const val = editPrices[override.id];
    if (!val || !serviceId) return;
    const price = parseFloat(val);
    if (isNaN(price)) return;
    upsertOverride.mutate(
      { service_id: serviceId, employee_id: override.employee_id, price },
      { onSuccess: () => setEditPrices(prev => { const n = { ...prev }; delete n[override.id]; return n; }) }
    );
  };

  const isLoading = overridesLoading || employeesLoading;

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-8" />;
  }

  const renderLevelMeta = (stylistLevel: string | null, levelPrice: number | null) => {
    const lvl = formatLevel(stylistLevel, levels as LevelRow[]);
    const priceLabel =
      levelPrice != null
        ? `Level: ${formatCurrencyTwoDecimal(levelPrice)}`
        : basePrice != null
          ? `Base: ${formatCurrencyTwoDecimal(basePrice)}`
          : null;
    return (
      <p className={cn(tokens.body.muted, 'flex items-center gap-1.5 text-xs')}>
        {lvl.number != null ? (
          <>
            <span className="font-display tracking-wide text-foreground/80">L{lvl.number}</span>
            <span className="text-muted-foreground">·</span>
            <span>{lvl.label}</span>
          </>
        ) : (
          <span className="italic">Unassigned</span>
        )}
        {priceLabel && (
          <>
            <span className="text-muted-foreground">·</span>
            <span>{priceLabel}</span>
          </>
        )}
      </p>
    );
  };

  return (
    <div className="space-y-4 min-h-[400px]">
      <div className="flex items-start gap-1.5">
        <p className={tokens.body.muted}>
          Set individual pricing per stylist. Overrides take priority over level pricing.
        </p>
        <MetricInfoTooltip description="Set a custom price for an individual stylist on this service. Takes priority over both level pricing and the base price." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: Current overrides */}
        <section className="rounded-xl border border-border/60 bg-card/40 flex flex-col min-h-[340px]">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <p className={cn(tokens.heading.subsection, 'flex items-center gap-2')}>
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Current Overrides
            </p>
            <span className="text-xs font-display tracking-wide text-muted-foreground">
              {overriddenEmployees.length}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto p-2 max-h-[55vh]">
            {overriddenEmployees.length === 0 ? (
              <div className={cn(tokens.empty.container, 'py-8')}>
                <Users className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No overrides yet</h3>
                <p className={tokens.empty.description}>
                  Add per-stylist pricing from the panel on the right →
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {overriddenEmployees.map(emp => {
                  const override = overrideMap[emp.id];
                  const levelPrice = getLevelPrice(emp.stylist_level);
                  const isEditing = editPrices[override.id] !== undefined;
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className={cn(tokens.body.emphasis, 'truncate text-sm')}>{formatDisplayName(emp.full_name, emp.display_name)}</p>
                        {renderLevelMeta(emp.stylist_level, levelPrice)}
                      </div>
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7 rounded-lg h-8 text-sm"
                          value={isEditing ? editPrices[override.id] : String(override.price)}
                          onChange={e => setEditPrices(prev => ({ ...prev, [override.id]: e.target.value }))}
                          onBlur={() => { if (isEditing) handleUpdateOverride(override); }}
                          onKeyDown={e => { if (e.key === 'Enter' && isEditing) handleUpdateOverride(override); }}
                          autoCapitalize="off"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteOverride.mutate({ id: override.id, serviceId: serviceId! })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Add override */}
        <section className="rounded-xl border border-border/60 bg-card/40 flex flex-col min-h-[340px]">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <p className={cn(tokens.heading.subsection, 'flex items-center gap-2')}>
              <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
              Add Override
            </p>
            <span className="text-xs font-display tracking-wide text-muted-foreground">
              {availableEmployees.length}
            </span>
          </header>
          <div className="px-3 pt-3 pb-2 sticky top-0 bg-card/40 border-b border-border/40 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or level (e.g. L3)…"
                className="pl-9 rounded-lg h-9 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoCapitalize="off"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 max-h-[55vh]">
            {availableEmployees.length === 0 ? (
              <div className={cn(tokens.empty.container, 'py-8')}>
                <UserPlus className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>
                  {search ? 'No matching stylists' : 'All set'}
                </h3>
                <p className={tokens.empty.description}>
                  {search ? 'Try a different name or level.' : 'Every active stylist has an override.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {availableEmployees.map(emp => {
                  const isAdding = addingEmployeeId === emp.id;
                  const levelPrice = getLevelPrice(emp.stylist_level);
                  return (
                    <div
                      key={emp.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg transition-colors',
                        isAdding ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/40'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(tokens.body.emphasis, 'truncate text-sm')}>{formatDisplayName(emp.full_name, emp.display_name)}</p>
                        {renderLevelMeta(emp.stylist_level, levelPrice)}
                      </div>
                      {isAdding ? (
                        <div className="flex items-center gap-1.5">
                          <div className="relative w-24 shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="pl-7 rounded-lg h-8 text-sm"
                              placeholder={(levelPrice ?? basePrice ?? 0).toFixed(2)}
                              value={newPrice}
                              onChange={e => setNewPrice(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddOverride();
                                if (e.key === 'Escape') { setAddingEmployeeId(null); setNewPrice(''); }
                              }}
                              autoCapitalize="off"
                              autoFocus
                            />
                          </div>
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-full shrink-0"
                            onClick={handleAddOverride}
                            disabled={upsertOverride.isPending || !newPrice.trim()}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full shrink-0 text-muted-foreground"
                            onClick={() => { setAddingEmployeeId(null); setNewPrice(''); }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-full text-xs shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => { setAddingEmployeeId(emp.id); setNewPrice(''); }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Set Price
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
