import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Plus, Check, X, Users, UserPlus, MapPin } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn, formatDisplayName } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useActiveLocations } from '@/hooks/useLocations';
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
  location_ids: string[];
}

interface LevelRow {
  id: string;
  slug: string;
  label: string;
}

const UNASSIGNED_KEY = '__unassigned__';

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
  const { data: locations = [] } = useActiveLocations(orgId);
  const upsertOverride = useUpsertStylistPriceOverride();
  const deleteOverride = useDeleteStylistPriceOverride();

  // Pull active employees
  const { data: employeesRaw = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-overrides', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('id, user_id, display_name, full_name, stylist_level, photo_url')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true);
      if (error) throw error;
      return data as unknown as Omit<EmployeeRow, 'location_ids'>[];
    },
    enabled: !!orgId,
  });

  // Pull location assignments per user
  const userIds = useMemo(() => employeesRaw.map(e => e.user_id).filter(Boolean), [employeesRaw]);
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['employee-locations-for-overrides', orgId, userIds.length],
    enabled: !!orgId && userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_location_schedules')
        .select('user_id, location_id')
        .in('user_id', userIds);
      if (error) throw error;
      return (data || []) as Array<{ user_id: string; location_id: string }>;
    },
  });

  // user_id → location_ids[]
  const userLocationsMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of schedules) {
      if (!s.user_id || !s.location_id) continue;
      const arr = m.get(s.user_id) || [];
      if (!arr.includes(s.location_id)) arr.push(s.location_id);
      m.set(s.user_id, arr);
    }
    return m;
  }, [schedules]);

  const employees: EmployeeRow[] = useMemo(
    () => employeesRaw.map(e => ({ ...e, location_ids: userLocationsMap.get(e.user_id) || [] })),
    [employeesRaw, userLocationsMap],
  );

  const [search, setSearch] = useState('');
  const [addingEmployeeId, setAddingEmployeeId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [locationFilter, setLocationFilter] = useState<string>('all'); // 'all' | locationId | UNASSIGNED_KEY

  const overrideMap = useMemo(() => {
    const m: Record<string, StylistPriceOverride> = {};
    overrides.forEach(o => { m[o.employee_id] = o; });
    return m;
  }, [overrides]);

  // Locations to display as groups (sorted by display_order from useActiveLocations)
  const sortedLocations = locations;
  const showFilterStrip = sortedLocations.length > 1;

  const overriddenEmployees = useMemo(
    () => employees.filter(e => overrideMap[e.id]),
    [employees, overrideMap],
  );

  const matchesSearchAndFilter = (emp: EmployeeRow): boolean => {
    // Location filter
    if (locationFilter === UNASSIGNED_KEY) {
      if (emp.location_ids.length > 0) return false;
    } else if (locationFilter !== 'all') {
      if (!emp.location_ids.includes(locationFilter)) return false;
    }
    // Search
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (emp.display_name || emp.full_name || '').toLowerCase();
    const lvl = formatLevel(emp.stylist_level, levels as LevelRow[]);
    const lvlText = `${lvl.number ? `l${lvl.number}` : ''} ${lvl.label}`.toLowerCase();
    const locText = emp.location_ids
      .map(id => sortedLocations.find(l => l.id === id)?.name?.toLowerCase() || '')
      .join(' ');
    return name.includes(q) || lvlText.includes(q) || locText.includes(q);
  };

  const availableEmployees = useMemo(
    () => employees.filter(e => !overrideMap[e.id]).filter(matchesSearchAndFilter),
    [employees, overrideMap, search, levels, locationFilter, sortedLocations],
  );

  // Group an employee list by location (repeating multi-location entries)
  type Group = { id: string; name: string; employees: EmployeeRow[] };
  const groupByLocation = (list: EmployeeRow[]): Group[] => {
    if (sortedLocations.length === 0) {
      return [{ id: 'all', name: 'All Stylists', employees: list }];
    }
    const filteredLocs =
      locationFilter === 'all' || locationFilter === UNASSIGNED_KEY
        ? sortedLocations
        : sortedLocations.filter(l => l.id === locationFilter);

    const groups: Group[] = filteredLocs.map(loc => ({
      id: loc.id,
      name: loc.name,
      employees: list.filter(e => e.location_ids.includes(loc.id)),
    }));

    if (locationFilter === 'all' || locationFilter === UNASSIGNED_KEY) {
      const unassigned = list.filter(e => e.location_ids.length === 0);
      if (locationFilter === UNASSIGNED_KEY || unassigned.length > 0) {
        groups.push({ id: UNASSIGNED_KEY, name: 'Unassigned', employees: unassigned });
      }
    }
    return groups;
  };

  const overriddenGroups = useMemo(
    () => groupByLocation(overriddenEmployees.filter(matchesSearchAndFilter)),
    [overriddenEmployees, sortedLocations, locationFilter, search, levels],
  );
  const availableGroups = useMemo(
    () => groupByLocation(availableEmployees),
    [availableEmployees, sortedLocations, locationFilter],
  );

  // Counts for filter chips
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { all: employees.length };
    for (const loc of sortedLocations) {
      counts[loc.id] = employees.filter(e => e.location_ids.includes(loc.id)).length;
    }
    counts[UNASSIGNED_KEY] = employees.filter(e => e.location_ids.length === 0).length;
    return counts;
  }, [employees, sortedLocations]);

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

  const isLoading = overridesLoading || employeesLoading || schedulesLoading;

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-8" />;
  }

  const renderLevelMeta = (emp: EmployeeRow, levelPrice: number | null) => {
    const lvl = formatLevel(emp.stylist_level, levels as LevelRow[]);
    const priceLabel =
      levelPrice != null
        ? `Level: ${formatCurrencyTwoDecimal(levelPrice)}`
        : basePrice != null
          ? `Base: ${formatCurrencyTwoDecimal(basePrice)}`
          : null;
    const isMulti = emp.location_ids.length > 1;
    const locNames = emp.location_ids
      .map(id => sortedLocations.find(l => l.id === id)?.name)
      .filter(Boolean) as string[];

    return (
      <p className={cn(tokens.body.muted, 'flex items-center gap-1.5 text-xs flex-wrap')}>
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
        {isMulti && (
          <>
            <span className="text-muted-foreground">·</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-display tracking-wide cursor-help">
                  <MapPin className="w-2.5 h-2.5" />
                  {emp.location_ids.length} locations
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Works at {locNames.join(', ')} — this override applies to all
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </p>
    );
  };

  const renderOverrideRow = (emp: EmployeeRow) => {
    const override = overrideMap[emp.id];
    const levelPrice = getLevelPrice(emp.stylist_level);
    const isEditing = editPrices[override.id] !== undefined;
    return (
      <div key={`${emp.id}-override`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
        <div className="flex-1 min-w-0">
          <p className={cn(tokens.body.emphasis, 'truncate text-sm')}>{formatDisplayName(emp.full_name, emp.display_name)}</p>
          {renderLevelMeta(emp, levelPrice)}
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
  };

  const renderCandidateRow = (emp: EmployeeRow) => {
    const isAdding = addingEmployeeId === emp.id;
    const levelPrice = getLevelPrice(emp.stylist_level);
    return (
      <div
        key={`${emp.id}-candidate`}
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg transition-colors',
          isAdding ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/40'
        )}
      >
        <div className="flex-1 min-w-0">
          <p className={cn(tokens.body.emphasis, 'truncate text-sm')}>{formatDisplayName(emp.full_name, emp.display_name)}</p>
          {renderLevelMeta(emp, levelPrice)}
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
  };

  const renderGroupHeader = (name: string, count: number) => (
    <div className="flex items-center gap-2 px-2 pt-3 pb-1.5 sticky top-0 bg-card/40 backdrop-blur-sm z-[1]">
      <MapPin className="w-3 h-3 text-muted-foreground" />
      <span className="text-[11px] font-display tracking-wide uppercase text-muted-foreground">{name}</span>
      <span className="text-[11px] font-display tracking-wide text-muted-foreground/70">· {count}</span>
      <div className="flex-1 h-px bg-border/40 ml-2" />
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 min-h-[400px]">
        <div className="space-y-1">
          <div className="flex items-start gap-1.5">
            <p className={tokens.body.muted}>
              Set individual pricing per stylist. Overrides take priority over level pricing.
            </p>
            <MetricInfoTooltip description="Set a custom price for an individual stylist on this service. Takes priority over both level pricing and the base price." />
          </div>
          <p className={cn(tokens.body.muted, 'text-xs italic')}>
            One override per stylist applies across every location they work at.
          </p>
        </div>

        {/* Location filter chip strip */}
        {showFilterStrip && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', name: 'All' },
              ...sortedLocations.map(l => ({ id: l.id, name: l.name })),
              ...(chipCounts[UNASSIGNED_KEY] > 0 ? [{ id: UNASSIGNED_KEY, name: 'Unassigned' }] : []),
            ].map(chip => {
              const active = locationFilter === chip.id;
              const count = chipCounts[chip.id] ?? 0;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setLocationFilter(chip.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors border',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card/40 text-muted-foreground border-border/60 hover:text-foreground hover:border-border',
                  )}
                >
                  <span className="font-sans">{chip.name}</span>
                  <span className={cn('font-display tracking-wide text-[10px]', active ? 'opacity-80' : 'opacity-60')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Add override */}
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
                  placeholder="Search by name, level, or location…"
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
                    {search || locationFilter !== 'all' ? 'No matching stylists' : 'All set'}
                  </h3>
                  <p className={tokens.empty.description}>
                    {search || locationFilter !== 'all'
                      ? 'Try a different filter or search.'
                      : 'Every active stylist has an override.'}
                  </p>
                </div>
              ) : (
                <div>
                  {availableGroups.map(group => (
                    <div key={`candidate-group-${group.id}`} className="mb-2">
                      {sortedLocations.length > 0 && renderGroupHeader(group.name, group.employees.length)}
                      {group.employees.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">No candidates at this location</p>
                      ) : (
                        <div className="space-y-1">
                          {group.employees.map(renderCandidateRow)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Current overrides */}
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
                    ← Add per-stylist pricing from the panel on the left
                  </p>
                </div>
              ) : (
                <div>
                  {overriddenGroups.map(group => (
                    <div key={`override-group-${group.id}`} className="mb-2">
                      {sortedLocations.length > 0 && renderGroupHeader(group.name, group.employees.length)}
                      {group.employees.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">No overrides at this location</p>
                      ) : (
                        <div className="space-y-1">
                          {group.employees.map(renderOverrideRow)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
