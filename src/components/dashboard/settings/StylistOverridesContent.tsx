import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2, Search, Ban } from 'lucide-react';
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
import {
  useStylistServiceExclusions,
  useToggleStylistServiceExclusion,
} from '@/hooks/useStylistExclusions';

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

export function StylistOverridesContent({ serviceId, basePrice }: StylistOverridesContentProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

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
    const q = search.toLowerCase();
    return employees
      .filter(e => !overrideMap[e.id])
      .filter(e => !q || (e.display_name || e.full_name).toLowerCase().includes(q));
  }, [employees, overrideMap, search]);

  const getLevelPrice = (stylistLevel: string | null): number | null => {
    if (!stylistLevel) return null;
    const level = levels.find(l => l.label === stylistLevel || l.slug === stylistLevel);
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

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-1.5">
        <p className={tokens.body.muted}>
          Set individual pricing per stylist. Overrides take priority over level pricing.
        </p>
        <MetricInfoTooltip description="Set a custom price for an individual stylist on this service. Takes priority over both level pricing and the base price." />
      </div>
      <div className="space-y-4 max-h-[40vh] overflow-y-auto p-1">
        {/* Existing overrides */}
        {overriddenEmployees.length > 0 && (
          <div className="space-y-2">
            <p className={tokens.heading.subsection}>Current Overrides</p>
            {overriddenEmployees.map(emp => {
              const override = overrideMap[emp.id];
              const levelPrice = getLevelPrice(emp.stylist_level);
              const isEditing = editPrices[override.id] !== undefined;

              return (
                <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className={cn(tokens.body.emphasis, 'truncate')}>{formatDisplayName(emp.full_name, emp.display_name)}</p>
                    <p className={tokens.body.muted}>
                      {emp.stylist_level || 'No level'}
                      {levelPrice != null && ` · Level: $${levelPrice.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="relative w-24">
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

        {/* Add override */}
        <div className="space-y-2">
          <p className={tokens.heading.subsection}>Add Override</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search stylists..."
              className="pl-9 rounded-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoCapitalize="off"
            />
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {availableEmployees.length === 0 ? (
              <p className={cn(tokens.body.muted, 'text-center py-3')}>
                {search ? 'No matching stylists' : 'All stylists have overrides'}
              </p>
            ) : (
              availableEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                    addingEmployeeId === emp.id ? 'bg-primary/10' : 'hover:bg-muted/40'
                  )}
                  onClick={() => { setAddingEmployeeId(emp.id); setNewPrice(''); }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(tokens.body.emphasis, 'truncate')}>{formatDisplayName(emp.full_name, emp.display_name)}</p>
                    <p className={tokens.body.muted}>{emp.stylist_level || 'No level'}</p>
                  </div>
                  {addingEmployeeId === emp.id && (
                    <div className="flex items-center gap-2">
                      <div className="relative w-24">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7 rounded-lg h-8 text-sm"
                          placeholder={basePrice != null ? basePrice.toFixed(2) : '0.00'}
                          value={newPrice}
                          onChange={e => setNewPrice(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddOverride(); }}
                          autoCapitalize="off"
                          autoFocus
                        />
                      </div>
                      <Button size={tokens.button.inline} className="h-8" onClick={e => { e.stopPropagation(); handleAddOverride(); }} disabled={upsertOverride.isPending}>
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
