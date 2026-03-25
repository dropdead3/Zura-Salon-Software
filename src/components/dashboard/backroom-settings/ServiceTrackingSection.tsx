import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useServiceTrackingComponents, useUpsertTrackingComponent, useDeleteTrackingComponent } from '@/hooks/backroom/useServiceTrackingComponents';
import { useServiceAllowancePolicies } from '@/hooks/billing/useServiceAllowancePolicies';
import { isSuggestedChemicalService } from '@/utils/serviceCategorization';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Loader2, Wrench, Plus, Trash2, Zap, ArrowRight, CircleDot, AlertTriangle, Package, FileText, ChevronDown, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { ServiceTrackingProgressBar, type ProgressMilestone } from './ServiceTrackingProgressBar';
import { ServiceTrackingQuickSetup } from './ServiceTrackingQuickSetup';

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  is_backroom_tracked: boolean;
  is_chemical_service: boolean;
  assistant_prep_allowed: boolean;
  smart_mix_assist_enabled: boolean;
  formula_memory_enabled: boolean;
  variance_threshold_pct: number;
}

type FilterTab = 'all' | 'tracked' | 'untracked' | 'attention' | 'uncategorized';

interface Props {
  onNavigate?: (section: string) => void;
}

export function ServiceTrackingSection({ onNavigate }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const activeFilter = (searchParams.get('filter') as FilterTab) || 'all';
  const setActiveFilter = (tab: FilterTab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'all') next.delete('filter');
      else next.set('filter', tab);
      return next;
    }, { replace: true });
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Keyboard shortcut: `/` to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const { data: allowancePolicies } = useServiceAllowancePolicies();
  const { data: allComponents } = useServiceTrackingComponents();

  const { data: services, isLoading } = useQuery({
    queryKey: ['backroom-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, is_backroom_tracked, is_chemical_service, assistant_prep_allowed, smart_mix_assist_enabled, formula_memory_enabled, variance_threshold_pct')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as unknown as ServiceRow[];
    },
    enabled: !!orgId,
  });

  const toggleTracking = useMutation({
    mutationFn: async ({ id, tracked }: { id: string; tracked: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_backroom_tracked: tracked })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkTrackMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('services')
        .update({ is_backroom_tracked: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      setSelectedIds(new Set());
      toast.success('Services tracked successfully');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceRow> }) => {
      const { error } = await supabase
        .from('services')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Derived data
  const allServices = services || [];
  const componentsByService = useMemo(() => {
    const map = new Map<string, number>();
    (allComponents || []).forEach((c) => {
      map.set(c.service_id, (map.get(c.service_id) || 0) + 1);
    });
    return map;
  }, [allComponents]);

  const allowanceByService = useMemo(() => {
    const map = new Map<string, typeof allowancePolicies extends (infer T)[] | undefined ? T : never>();
    (allowancePolicies || []).forEach((p) => {
      map.set(p.service_id, p);
    });
    return map;
  }, [allowancePolicies]);

  // Classification helpers
  const getServiceType = (s: ServiceRow): 'chemical' | 'suggested' | 'standard' => {
    if (s.is_chemical_service) return 'chemical';
    if (isSuggestedChemicalService(s.name, s.category)) return 'suggested';
    return 'standard';
  };

  const needsAttention = (s: ServiceRow): boolean => {
    const type = getServiceType(s);
    // Chemical but not tracked
    if ((type === 'chemical' || type === 'suggested') && !s.is_backroom_tracked) return true;
    // Tracked but missing components or allowance
    if (s.is_backroom_tracked && (!componentsByService.has(s.id) || !allowanceByService.has(s.id))) return true;
    return false;
  };

  // Progress milestones
  const milestones: ProgressMilestone[] = useMemo(() => {
    const chemicalOrSuggested = allServices.filter(s => getServiceType(s) !== 'standard');
    const tracked = allServices.filter(s => s.is_backroom_tracked);
    const classified = allServices.filter(s => s.is_chemical_service || s.category !== null);
    const withComponents = tracked.filter(s => componentsByService.has(s.id));
    const withAllowance = tracked.filter(s => allowanceByService.has(s.id));

    return [
      {
        label: 'Classified',
        current: classified.length,
        total: allServices.length,
        tooltip: 'Services with a category assigned or explicitly marked as chemical/non-chemical.',
      },
      {
        label: 'Tracked',
        current: tracked.length,
        total: Math.max(chemicalOrSuggested.length, tracked.length),
        tooltip: 'Chemical services with backroom tracking enabled.',
      },
      {
        label: 'Components',
        current: withComponents.length,
        total: tracked.length,
        tooltip: 'Tracked services with at least one product component mapped.',
      },
      {
        label: 'Allowances',
        current: withAllowance.length,
        total: tracked.length,
        tooltip: 'Tracked services with a billing allowance policy configured.',
      },
    ];
  }, [allServices, componentsByService, allowanceByService]);

  // Filtered list
  const filteredServices = useMemo(() => {
    switch (activeFilter) {
      case 'tracked':
        return allServices.filter(s => s.is_backroom_tracked);
      case 'untracked':
        return allServices.filter(s => !s.is_backroom_tracked);
      case 'attention':
        return allServices.filter(s => needsAttention(s));
      case 'uncategorized':
        return allServices.filter(s => !s.category);
      default:
        return allServices;
    }
  }, [allServices, activeFilter, componentsByService, allowanceByService]);

  // Search filter (applied after tab filter)
  const searchedServices = useMemo(() => {
    if (!searchQuery.trim()) return filteredServices;
    const q = searchQuery.toLowerCase();
    return filteredServices.filter(s => s.name.toLowerCase().includes(q));
  }, [filteredServices, searchQuery]);

  // Expand toggle helper
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Counts for filter tabs
  const filterCounts = useMemo(() => ({
    all: allServices.length,
    tracked: allServices.filter(s => s.is_backroom_tracked).length,
    untracked: allServices.filter(s => !s.is_backroom_tracked).length,
    attention: allServices.filter(s => needsAttention(s)).length,
    uncategorized: allServices.filter(s => !s.category).length,
  }), [allServices, componentsByService, allowanceByService]);

  // Suggested untracked for auto-detect banner
  const suggestedUntracked = allServices.filter(
    s => !s.is_backroom_tracked && !s.is_chemical_service && isSuggestedChemicalService(s.name, s.category)
  );
  const chemicalUntracked = allServices.filter(
    s => !s.is_backroom_tracked && (s.is_chemical_service || isSuggestedChemicalService(s.name, s.category))
  );

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    const untracked = filteredServices.filter(s => !s.is_backroom_tracked);
    if (untracked.every(s => selectedIds.has(s.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(untracked.map(s => s.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'tracked', label: 'Tracked' },
    { key: 'untracked', label: 'Untracked' },
    { key: 'attention', label: 'Needs Attention' },
    { key: 'uncategorized', label: 'Uncategorized' },
  ];

  return (
    <div className="space-y-6">
      <Infotainer
        id="backroom-services-guide"
        title="Service Tracking"
        description="Link your services (e.g. Balayage, Root Touch-Up) to the products they consume. This tells Zura which products to expect when a stylist mixes for that service."
        icon={<Wrench className="h-4 w-4 text-primary" />}
      />

      {/* Configuration Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ServiceTrackingProgressBar milestones={milestones} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setWizardOpen(true)}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Quick Setup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-detect banner (slim inline) */}
      {chemicalUntracked.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          <p className={cn(tokens.body.muted, 'flex-1')}>
            <span className="text-foreground font-sans font-medium">{chemicalUntracked.length} chemical service{chemicalUntracked.length > 1 ? 's' : ''}</span>{' '}
            detected but not yet tracked.
          </p>
          <Button
            size="sm"
            onClick={() => bulkTrackMutation.mutate(chemicalUntracked.map(s => s.id))}
            disabled={bulkTrackMutation.isPending}
          >
            Track All
          </Button>
        </div>
      )}

      {/* Unified Service Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Wrench className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>
                  All Services
                  <MetricInfoTooltip description="Complete view of all active services. Toggle tracking, view configuration status, and identify gaps." />
                </CardTitle>
                <CardDescription>
                  {filterCounts.tracked} tracked · {filterCounts.untracked} untracked · {filterCounts.attention > 0 && (
                    <span className="text-amber-500">{filterCounts.attention} need attention</span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => bulkTrackMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkTrackMutation.isPending}
                >
                  Track Selected ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(dashPath('/admin/settings?category=services'))}
              >
                Services Configurator
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Filter tabs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => { setActiveFilter(f.key); setSelectedIds(new Set()); }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-sans transition-colors border',
                    activeFilter === f.key
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted',
                    f.key === 'attention' && filterCounts.attention > 0 && activeFilter !== f.key && 'border-amber-500/30 text-amber-600 dark:text-amber-400',
                  )}
                >
                  {f.label}
                  <span className="ml-1.5 tabular-nums">{filterCounts[f.key]}</span>
                </button>
              ))}
            </div>
            {allServices.length >= 15 && (
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  type="text"
                  autoCapitalize="off"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 h-8 text-xs rounded-full"
                />
                {!searchQuery && (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-sans text-muted-foreground/60 border border-border/60 rounded px-1 py-0.5 leading-none">/</kbd>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          {searchedServices.length === 0 ? (
            <div className={tokens.empty.container}>
              <Wrench className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>
                {searchQuery ? 'No matching services' : activeFilter === 'attention' ? 'All clear!' : 'No services found'}
              </h3>
              <p className={tokens.empty.description}>
                {searchQuery
                  ? 'Try a different search term.'
                  : activeFilter === 'attention'
                    ? 'All chemical services are tracked and configured.'
                    : 'Adjust your filter or add services in the Services Configurator.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          searchedServices.filter(s => !s.is_backroom_tracked).length > 0 &&
                          searchedServices.filter(s => !s.is_backroom_tracked).every(s => selectedIds.has(s.id))
                        }
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Category</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Type</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Tracked</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Config</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchedServices.map((service) => {
                    const type = getServiceType(service);
                    const hasComponents = componentsByService.has(service.id);
                    const hasAllowance = allowanceByService.has(service.id);
                    const attention = needsAttention(service);
                    const isExpanded = expandedIds.has(service.id);

                    return (
                      <Collapsible key={service.id} open={isExpanded} onOpenChange={() => toggleExpand(service.id)} asChild>
                        <>
                          <TableRow className={cn(attention && 'bg-amber-500/[0.03]')}>
                            {/* Checkbox */}
                            <TableCell>
                              {!service.is_backroom_tracked && (
                                <Checkbox
                                  checked={selectedIds.has(service.id)}
                                  onCheckedChange={() => toggleSelect(service.id)}
                                />
                              )}
                            </TableCell>

                            {/* Status dot */}
                            <TableCell>
                              <div className={cn(
                                'w-2.5 h-2.5 rounded-full',
                                service.is_backroom_tracked
                                  ? 'bg-primary'
                                  : (type === 'chemical' || type === 'suggested')
                                    ? 'bg-amber-500'
                                    : 'bg-muted-foreground/30',
                              )} />
                            </TableCell>

                            {/* Name */}
                            <TableCell>
                              <span className={cn(
                                'text-sm font-sans',
                                service.is_backroom_tracked ? 'text-foreground font-medium' : 'text-muted-foreground',
                              )}>
                                {service.name}
                              </span>
                            </TableCell>

                            {/* Category */}
                            <TableCell>
                              {service.category ? (
                                <span className="text-xs text-muted-foreground">{service.category}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">None</span>
                              )}
                            </TableCell>

                            {/* Type badge */}
                            <TableCell>
                              {type === 'chemical' && (
                                <Badge variant="default" className="text-[10px]">Chemical</Badge>
                              )}
                              {type === 'suggested' && (
                                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">Suggested</Badge>
                              )}
                              {type === 'standard' && (
                                <Badge variant="secondary" className="text-[10px]">Standard</Badge>
                              )}
                            </TableCell>

                            {/* Tracking toggle */}
                            <TableCell>
                              <Switch
                                checked={service.is_backroom_tracked}
                                onCheckedChange={(v) => toggleTracking.mutate({ id: service.id, tracked: v })}
                                className="scale-90"
                              />
                            </TableCell>

                            {/* Config status */}
                            <TableCell>
                              {service.is_backroom_tracked ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-0.5">
                                    <Package className={cn(
                                      'w-3.5 h-3.5',
                                      hasComponents ? 'text-primary' : 'text-muted-foreground/30',
                                    )} />
                                    <MetricInfoTooltip description={hasComponents ? 'Product components mapped' : 'No product components mapped yet'} />
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <FileText className={cn(
                                      'w-3.5 h-3.5',
                                      hasAllowance ? 'text-primary' : 'text-muted-foreground/30',
                                    )} />
                                    <MetricInfoTooltip description={hasAllowance ? 'Allowance policy configured' : 'No allowance policy set'} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {service.is_backroom_tracked && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setSelectedServiceId(service.id)}
                                    >
                                      Components
                                    </Button>
                                    <button
                                      onClick={() => toggleExpand(service.id)}
                                      className="p-1 rounded-md hover:bg-muted transition-colors"
                                    >
                                      <ChevronDown className={cn(
                                        'w-4 h-4 text-muted-foreground transition-transform duration-200',
                                        isExpanded && 'rotate-180',
                                      )} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expandable config row */}
                          {service.is_backroom_tracked && (
                            <CollapsibleContent asChild>
                              <tr>
                                <td colSpan={8} className="p-0">
                                  <div className="px-6 py-4 bg-muted/30 border-t border-border/30">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-sans text-muted-foreground">Assistant Prep</label>
                                        <Switch
                                          checked={service.assistant_prep_allowed}
                                          onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { assistant_prep_allowed: v } })}
                                          className="scale-90"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-sans text-muted-foreground">Smart Mix Assist</label>
                                        <Switch
                                          checked={service.smart_mix_assist_enabled}
                                          onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { smart_mix_assist_enabled: v } })}
                                          className="scale-90"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-sans text-muted-foreground">Formula Memory</label>
                                        <Switch
                                          checked={service.formula_memory_enabled}
                                          onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { formula_memory_enabled: v } })}
                                          className="scale-90"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-sans text-muted-foreground">
                                          Variance Threshold
                                          <MetricInfoTooltip description="Maximum acceptable deviation from baseline usage before flagging." />
                                        </label>
                                        <div className="flex items-center gap-2">
                                          <Slider
                                            value={[service.variance_threshold_pct]}
                                            onValueChange={([v]) => updateService.mutate({ id: service.id, updates: { variance_threshold_pct: v } })}
                                            min={5}
                                            max={50}
                                            step={5}
                                            className="flex-1"
                                          />
                                          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{service.variance_threshold_pct}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </CollapsibleContent>
                          )}
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Next step hint */}
          {onNavigate && filterCounts.tracked > 0 && (
            <div className="flex justify-end pt-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onNavigate('formulas')}>
                Next: Formula Baselines <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Wizard */}
      {orgId && (
        <ServiceTrackingQuickSetup
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          orgId={orgId}
          services={allServices}
          milestones={milestones}
          componentsByService={componentsByService}
          allowanceByService={allowanceByService}
          onNavigateAllowances={onNavigate ? () => onNavigate('allowances') : undefined}
        />
      )}

      {/* Component mapping dialog */}
      {selectedServiceId && (
        <ComponentMappingDialog
          serviceId={selectedServiceId}
          serviceName={services?.find((s) => s.id === selectedServiceId)?.name || ''}
          orgId={orgId!}
          onClose={() => setSelectedServiceId(null)}
        />
      )}
    </div>
  );
}

function ComponentMappingDialog({ serviceId, serviceName, orgId, onClose }: {
  serviceId: string;
  serviceName: string;
  orgId: string;
  onClose: () => void;
}) {
  const { data: components, isLoading } = useServiceTrackingComponents(serviceId);
  const upsertComponent = useUpsertTrackingComponent();
  const deleteComponent = useDeleteTrackingComponent();
  const [addingProduct, setAddingProduct] = useState(false);

  const { data: backroomProducts } = useQuery({
    queryKey: ['backroom-products-for-mapping', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_backroom_tracked', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; category: string | null }[];
    },
    enabled: !!orgId,
  });

  const mappedIds = new Set((components || []).map((c) => c.product_id));
  const availableProducts = (backroomProducts || []).filter((p) => !mappedIds.has(p.id));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>{serviceName} — Components</DialogTitle>
          <DialogDescription className={tokens.body.muted}>
            Map tracked products that are consumed during this service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            <>
              {(components || []).map((comp) => (
                <div key={comp.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans font-medium text-foreground truncate">
                      {backroomProducts?.find((p) => p.id === comp.product_id)?.name || comp.product_id}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{comp.component_role}</Badge>
                      {comp.estimated_quantity && (
                        <span className="text-[10px] text-muted-foreground">{comp.estimated_quantity}{comp.unit}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MetricInfoTooltip description="Required = always used. Optional = sometimes used. Conditional = depends on technique." />
                    <Select
                      value={comp.component_role}
                      onValueChange={(v) => upsertComponent.mutate({
                        organization_id: orgId,
                        service_id: serviceId,
                        product_id: comp.product_id,
                        component_role: v,
                      })}
                    >
                      <SelectTrigger className="w-[100px] h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['required', 'optional', 'conditional', 'estimated', 'manual'].map((r) => (
                          <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteComponent.mutate(comp.id)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              {addingProduct ? (
                <Select
                  onValueChange={(productId) => {
                    upsertComponent.mutate({
                      organization_id: orgId,
                      service_id: serviceId,
                      product_id: productId,
                    });
                    setAddingProduct(false);
                  }}
                >
                  <SelectTrigger className="w-full font-sans text-sm">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingProduct(true)}
                  className="w-full"
                  disabled={availableProducts.length === 0}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {availableProducts.length === 0 ? 'No available products' : 'Add Component'}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
