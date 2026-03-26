import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

import { useServiceAllowancePolicies, useUpsertAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { isSuggestedChemicalService } from '@/utils/serviceCategorization';
import { useIsMobile } from '@/hooks/use-mobile';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Loader2, Wrench, Plus, Zap, ArrowRight, CircleDot, AlertTriangle, FileText, ChevronDown, ChevronRight, Search, Sparkles, CheckCircle2, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { ServiceTrackingProgressBar, type ProgressMilestone } from './ServiceTrackingProgressBar';
import { ServiceTrackingQuickSetup } from './ServiceTrackingQuickSetup';
import { AllowanceCalculatorDialog } from './AllowanceCalculatorDialog';
import { PriceRecommendationCard } from './PriceRecommendationCard';
import { useComputedPriceRecommendations, useAcceptPriceRecommendation, useDismissPriceRecommendation } from '@/hooks/backroom/useServicePriceRecommendations';

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  is_backroom_tracked: boolean;
  is_chemical_service: boolean | null;
  assistant_prep_allowed: boolean;
  smart_mix_assist_enabled: boolean;
  formula_memory_enabled: boolean;
  variance_threshold_pct: number;
  backroom_config_dismissed: boolean;
  container_types: ('bowl' | 'bottle')[];
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
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ y: number; id: string } | null>(null);
  
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
  const [liveThresholds, setLiveThresholds] = useState<Record<string, number>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [allowanceEditing, setAllowanceEditing] = useState<Set<string>>(new Set());
  const [allowanceDraft, setAllowanceDraft] = useState<Record<string, { qty: number; rate: string }>>({});
  const upsertPolicy = useUpsertAllowancePolicy();
  const [calculatorServiceId, setCalculatorServiceId] = useState<string | null>(null);
  const [calculatorServiceName, setCalculatorServiceName] = useState('');
  const [calculatorContainerTypes, setCalculatorContainerTypes] = useState<('bowl' | 'bottle')[]>(['bowl']);
  const [calculatorServicePrice, setCalculatorServicePrice] = useState<number | null>(null);

  // Price recommendations
  const { data: priceRecommendations } = useComputedPriceRecommendations();
  const acceptPriceRec = useAcceptPriceRecommendation();
  const dismissPriceRec = useDismissPriceRecommendation();
  const priceRecMap = useMemo(() => {
    const map = new Map<string, import('@/lib/backroom/price-recommendation').PriceRecommendation>();
    for (const r of (priceRecommendations || [])) {
      if (r.is_below_target) map.set(r.service_id, r);
    }
    return map;
  }, [priceRecommendations]);

  // Swipe gesture handlers for mobile
  const handleTouchStart = useCallback((serviceId: string, e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, id: serviceId };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const id = touchStartRef.current.id;
    touchStartRef.current = null;
    if (Math.abs(deltaY) < 40) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (deltaY > 0 && !next.has(id)) next.add(id);       // swipe down = expand
      else if (deltaY < 0 && next.has(id)) next.delete(id); // swipe up = collapse
      return next;
    });
  }, []);

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
  

  const { data: categoryOrder } = useQuery({
    queryKey: ['service-category-colors-order', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_category_colors')
        .select('category_name, display_order')
        .eq('organization_id', orgId!)
        .order('display_order')
        .order('category_name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const categoryOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    (categoryOrder ?? []).forEach(c => map.set(c.category_name, c.display_order));
    return map;
  }, [categoryOrder]);

  const { data: services, isLoading } = useQuery({
    queryKey: ['backroom-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, price, is_backroom_tracked, is_chemical_service, assistant_prep_allowed, smart_mix_assist_enabled, formula_memory_enabled, variance_threshold_pct, backroom_config_dismissed, container_types')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('category')
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
      const svc = (services || []).find(s => s.id === id);

      // Auto-reset configured status when settings change
      const didResetConfig = !!(svc?.backroom_config_dismissed && !('backroom_config_dismissed' in updates));
      if (didResetConfig) {
        updates.backroom_config_dismissed = false;
      }

      const { error } = await supabase
        .from('services')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;

      // Sync container_types to phorest_services so the Dock reads the correct vessels
      if (updates.container_types && orgId && svc?.name) {
        await (supabase.from('phorest_services') as any)
          .update({ container_types: updates.container_types })
          .eq('name', svc.name)
          .eq('organization_id', orgId);
      }

      return { didResetConfig };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['org-services'] });
      queryClient.invalidateQueries({ queryKey: ['service-lookup-map'] });
      if (result?.didResetConfig) {
        toast.info('Settings changed — click "Finalize Configuration" to re-confirm.');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Derived data
  const allServices = services || [];

  const allowanceByService = useMemo(() => {
    const map = new Map<string, typeof allowancePolicies extends (infer T)[] | undefined ? T : never>();
    (allowancePolicies || []).forEach((p) => {
      map.set(p.service_id, p);
    });
    return map;
  }, [allowancePolicies]);

  // Classification helpers
  const getServiceType = (s: ServiceRow): 'chemical' | 'suggested' | 'standard' => {
    if (s.is_chemical_service === true) return 'chemical';
    if (s.is_chemical_service === null && isSuggestedChemicalService(s.name, s.category)) return 'suggested';
    return 'standard';
  };

  const needsAttention = (s: ServiceRow): boolean => {
    if (s.backroom_config_dismissed) return false;
    const type = getServiceType(s);
    // Chemical but not tracked
    if ((type === 'chemical' || type === 'suggested') && !s.is_backroom_tracked) return true;
    // Tracked but missing components or allowance
    if (s.is_backroom_tracked && !allowanceByService.has(s.id)) return true;
    return false;
  };

  // Progress milestones
  const milestones: ProgressMilestone[] = useMemo(() => {
    const chemicalOrSuggested = allServices.filter(s => getServiceType(s) !== 'standard');
    const tracked = allServices.filter(s => s.is_backroom_tracked);
    const classified = allServices.filter(s => s.is_chemical_service !== null);
    const withAllowance = tracked.filter(s => allowanceByService.has(s.id));

    return [
      {
        label: 'Classify & Track Services',
        current: classified.length,
        total: allServices.length,
        tooltip: 'Review each service and mark whether it requires color or chemical products.',
      },
      {
        label: 'Set Allowances',
        current: withAllowance.length,
        total: tracked.length,
        tooltip: 'Define supply allowances and overage billing rules for tracked services.',
      },
    ];
  }, [allServices, allowanceByService]);

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
  }, [allServices, activeFilter, allowanceByService]);

  // Search filter (applied after tab filter)
  const searchedServices = useMemo(() => {
    let list = filteredServices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    // Sort by category display_order, then alphabetically by name
    return [...list].sort((a, b) => {
      const catA = a.category || '';
      const catB = b.category || '';
      const orderA = categoryOrderMap.get(catA) ?? 9999;
      const orderB = categoryOrderMap.get(catB) ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
  }, [filteredServices, searchQuery, categoryOrderMap]);

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
  }), [allServices, allowanceByService]);

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
            <span className="text-foreground font-sans font-medium">{chemicalUntracked.length} color/chemical service{chemicalUntracked.length > 1 ? 's' : ''}</span>{' '}
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
                    ? 'All color/chemical services are tracked and configured.'
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
                    <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Tracked</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchedServices.map((service, idx) => {
                    const prevCategory = idx > 0 ? (searchedServices[idx - 1].category || 'Other') : null;
                    const currentCategory = service.category || 'Other';
                    const showCategoryHeader = currentCategory !== prevCategory;
                    const type = getServiceType(service);
                    const hasAllowance = allowanceByService.has(service.id);
                    const attention = needsAttention(service);
                    const isExpanded = expandedIds.has(service.id);

                    // Inline config summary for tracked services
                    const activeToggles = service.is_backroom_tracked
                      ? [service.assistant_prep_allowed, service.smart_mix_assist_enabled, service.formula_memory_enabled].filter(Boolean).length
                      : 0;

                    return (
                      <React.Fragment key={service.id}>
                        {showCategoryHeader && (
                          <TableRow className="bg-muted/30 pointer-events-none">
                            <TableCell colSpan={4} className="py-1.5 px-4">
                              <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">
                                {currentCategory}
                              </span>
                            </TableCell>
                          </TableRow>
                        )}
                          <TableRow
                            className={cn(
                              attention && 'bg-amber-500/[0.03]',
                              service.backroom_config_dismissed && 'bg-emerald-500/[0.04]',
                              'cursor-pointer'
                            )}
                            onClick={() => toggleExpand(service.id)}
                            {...(isMobile ? {
                              onTouchStart: (e: React.TouchEvent) => handleTouchStart(service.id, e),
                              onTouchEnd: handleTouchEnd,
                            } : {})}
                          >
                            {/* Checkbox / Status dot */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {!service.is_backroom_tracked ? (
                                <Checkbox
                                  checked={selectedIds.has(service.id)}
                                  onCheckedChange={() => toggleSelect(service.id)}
                                />
                              ) : (
                                <div className={cn(
                                  'w-2.5 h-2.5 rounded-full',
                                  'bg-primary',
                                )} />
                              )}
                            </TableCell>

                            {/* Service — Name + Category subtitle + Type badge + Inline summary */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      'text-sm font-sans truncate',
                                      service.is_backroom_tracked ? 'text-foreground font-medium' : 'text-muted-foreground',
                                    )}>
                                      {service.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {service.category && (
                                      <span className="text-[11px] text-muted-foreground">{service.category}</span>
                                    )}
                                    {service.is_backroom_tracked && (
                                      <>
                                        {service.category && <span className="text-[11px] text-muted-foreground/40">·</span>}
                                        <span className={cn(
                                          'text-[11px]',
                                          activeToggles === 3 ? 'text-primary' : 'text-muted-foreground',
                                        )}>
                                          {activeToggles}/3 on
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Tracking toggle */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 justify-end">
                                {type === 'chemical' && (
                                  <Badge variant="default" className="text-[10px] shrink-0 gap-1"><CheckCircle2 className="w-3 h-3" />Requires Color/Chemical</Badge>
                                )}
                                {type === 'suggested' && (
                                  <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400">Suggested</Badge>
                                )}
                                {service.backroom_config_dismissed ? (
                                  <Badge variant="outline" className="text-[10px] shrink-0 min-w-[6.5rem] justify-center border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">Configured ✓</Badge>
                                ) : service.is_backroom_tracked && (() => {
                                  const hasPolicy = allowancePolicies?.some(p => p.service_id === service.id && p.is_active);
                                  return hasPolicy;
                                })() ? (
                                  <Badge variant="outline" className="text-[10px] shrink-0 min-w-[6.5rem] justify-center border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400">Allowance Set</Badge>
                                ) : service.is_backroom_tracked ? (
                                  <Badge variant="outline" className="text-[10px] shrink-0 min-w-[6.5rem] justify-center border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400">Unconfigured</Badge>
                                ) : null}
                                <Switch
                                  checked={service.is_backroom_tracked}
                                  onCheckedChange={(v) => toggleTracking.mutate({ id: service.id, tracked: v })}
                                  className="scale-90"
                                />
                              </div>
                            </TableCell>

                            {/* Expand chevron */}
                            <TableCell>
                              <ChevronDown className={cn(
                                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                                isExpanded && 'rotate-180',
                              )} />
                            </TableCell>
                          </TableRow>

                          {/* Animated expandable detail row */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                               <motion.tr
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                 style={{ overflow: 'clip' }}
                               >
                                 <td colSpan={4} className="p-0">
                                   <motion.div
                                     initial={{ opacity: 0, y: -8 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     exit={{ opacity: 0, y: -8 }}
                                     transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], delay: 0.08 }}
                                     className="px-6 py-4 bg-muted/30 border-t border-border/30"
                                   >
                                    {service.is_backroom_tracked ? (
                                       <div className="space-y-4">
                                         {/* Chemical toggle + vessel selector — FIRST */}
                                         <div className="flex flex-wrap items-center gap-4 pb-3 mb-3 border-b border-border/40">
                                           <div className="flex items-center gap-2">
                                             <label className="text-[10px] font-sans text-muted-foreground whitespace-nowrap">Requires Color/Chemical</label>
                                             <Switch
                                               checked={service.is_chemical_service}
                                               onCheckedChange={(v) => {
                                                 if (v) {
                                                   const containers = (service.container_types?.length) ? service.container_types : ['bowl'] as ('bowl' | 'bottle')[];
                                                   updateService.mutate({ id: service.id, updates: { is_chemical_service: true, container_types: containers } });
                                                 } else {
                                                   updateService.mutate({ id: service.id, updates: { is_chemical_service: false, is_backroom_tracked: false, container_types: [] } });
                                                 }
                                               }}
                                             />
                                           </div>
                                           {service.is_chemical_service && (
                                             <div className="flex items-center gap-1.5">
                                               <span className="text-xs font-sans text-muted-foreground">Vessels:</span>
                                               {(['bowl', 'bottle'] as const).map((vt, idx) => {
                                                 const active = (service.container_types || []).includes(vt);
                                                 return (
                                                   <React.Fragment key={vt}>
                                                     {idx === 1 && (
                                                       <span className="text-xs font-sans text-muted-foreground/70 italic">and/or</span>
                                                     )}
                                                     <button
                                                       className={cn(
                                                         'px-3 py-1 rounded-full text-xs font-sans capitalize transition-colors border flex items-center gap-1',
                                                         active
                                                           ? 'bg-primary text-primary-foreground border-primary'
                                                           : 'bg-transparent border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground'
                                                       )}
                                                       onClick={(e) => {
                                                         e.stopPropagation();
                                                         const current = service.container_types || [];
                                                         if (active && current.length === 1) {
                                                           toast.error('At least one vessel type is required');
                                                           return;
                                                         }
                                                         const next = active ? current.filter(t => t !== vt) : [...current, vt];
                                                         updateService.mutate({ id: service.id, updates: { container_types: next } });
                                                       }}
                                                     >
                                                       {active ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                       {vt === 'bowl' ? 'Bowls' : 'Bottles'}
                                                     </button>
                                                   </React.Fragment>
                                                 );
                                               })}
                                             </div>
                                           )}
                                         </div>

                                          {/* Allowance config + actions — gated on vessel selection */}
                                          {(service.container_types || []).length > 0 && (
                                          <div className="flex items-start justify-between gap-4">
                                             {(() => {
                                               const policy = allowanceByService.get(service.id);

                                                if (policy && policy.is_active) {
                                                  const recipeNote = policy.notes?.startsWith('Recipe-based:') ? policy.notes.replace('Recipe-based: ', '') : null;
                                                   const healthStatus = policy.allowance_health_status;
                                                   const healthPct = policy.allowance_health_pct;
                                                  return (
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <FileText className="w-3.5 h-3.5 text-primary" />
                                                      <span className="font-sans text-muted-foreground">
                                                        {recipeNote || `${policy.included_allowance_qty}${policy.allowance_unit} included · $${Number(policy.overage_rate).toFixed(2)}/${policy.allowance_unit} overage`}
                                                      </span>
                                                       {healthStatus && healthPct !== null && (
                                                         <Badge
                                                           variant="outline"
                                                           className={cn(
                                                             'text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity',
                                                             healthStatus === 'healthy' && 'text-emerald-500 border-emerald-500/30',
                                                             healthStatus === 'high' && 'text-amber-500 border-amber-500/30',
                                                             healthStatus === 'low' && 'text-blue-500 border-blue-500/30',
                                                           )}
                                                           onClick={(e) => {
                                                             e.stopPropagation();
                                                             setCalculatorServiceId(service.id);
                                                             setCalculatorServiceName(service.name);
                                                             setCalculatorContainerTypes((service.container_types || ['bowl']) as ('bowl' | 'bottle')[]);
                                                             setCalculatorServicePrice(service.price);
                                                           }}
                                                         >
                                                           {healthPct.toFixed(1)}%
                                                           {healthStatus === 'high' && ' ⚠'}
                                                         </Badge>
                                                       )}
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={tokens.button.inlineGhost}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                           setCalculatorServiceId(service.id);
                                                           setCalculatorServiceName(service.name);
                                                           setCalculatorContainerTypes((service.container_types || ['bowl']) as ('bowl' | 'bottle')[]);
                                                           setCalculatorServicePrice(service.price);
                                                        }}
                                                      >
                                                        Edit
                                                      </Button>
                                                    </div>
                                                  );
                                                }

                                                return (
                                                  <div className="flex items-center gap-2 text-xs">
                                                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7 text-xs border-dashed"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                         setCalculatorServiceId(service.id);
                                                         setCalculatorServiceName(service.name);
                                                         setCalculatorContainerTypes((service.container_types || ['bowl']) as ('bowl' | 'bottle')[]);
                                                         setCalculatorServicePrice(service.price);
                                                      }}
                                                    >
                                                      Configure Allowance
                                                    </Button>
                                                    <MetricInfoTooltip description="Use benchmark products to set a dollar allowance for this service. Stylists can mix any product — once the allowance is reached, overage costs are passed to the client at checkout." />
                                                  </div>
                                               );
                                             })()}
                                          </div>
                                          )}
                                        {/* Toggles grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                          <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-sans text-muted-foreground whitespace-nowrap">Assistant Prep</label>
                                            <Switch
                                              checked={service.assistant_prep_allowed}
                                              onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { assistant_prep_allowed: v } })}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-sans text-muted-foreground whitespace-nowrap">Smart Mix Assist</label>
                                            <Switch
                                              checked={service.smart_mix_assist_enabled}
                                              onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { smart_mix_assist_enabled: v } })}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-sans text-muted-foreground whitespace-nowrap">Formula Memory</label>
                                            <Switch
                                              checked={service.formula_memory_enabled}
                                              onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { formula_memory_enabled: v } })}
                                            />
                                          </div>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-sans text-muted-foreground flex items-center gap-1">
                                              Variance Threshold
                                              <MetricInfoTooltip description="Sets the maximum acceptable deviation from a service's baseline product usage. When a stylist's actual product usage exceeds this threshold (e.g., using 15% more product than the baseline on a 10% threshold), Zura automatically flags it as a variance exception. These flags surface in the Backroom Command Center alerts, the staff compliance leaderboard, and individual staff reports — giving managers visibility into usage patterns without interrupting the stylist's workflow." />
                                            </label>
                                            <div className="flex items-center gap-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
                                              <Slider
                                                key={`${service.id}-${service.variance_threshold_pct}`}
                                                defaultValue={[service.variance_threshold_pct || 10]}
                                                onValueChange={([v]) => {
                                                  setLiveThresholds(prev => ({ ...prev, [service.id]: v }));
                                                }}
                                                onValueCommit={([v]) => {
                                                  if (v !== service.variance_threshold_pct) {
                                                    updateService.mutate({ id: service.id, updates: { variance_threshold_pct: v } });
                                                  }
                                                }}
                                                min={5}
                                                max={50}
                                                step={5}
                                                className="flex-1"
                                              />
                                              <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{(liveThresholds[service.id] ?? (service.variance_threshold_pct || 10))}%</span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Price Recommendation inline alert */}
                                        {(() => {
                                          const rec = priceRecMap.get(service.id);
                                          if (!rec) return null;
                                          return (
                                            <PriceRecommendationCard
                                              recommendation={rec}
                                              onAccept={() => acceptPriceRec.mutate(rec)}
                                              onDismiss={() => dismissPriceRec.mutate(rec)}
                                              isAccepting={acceptPriceRec.isPending}
                                            />
                                          );
                                        })()}
                                        {/* Mark Configured footer */}
                                        <div className="bg-primary/5 border-t border-primary/20 rounded-b-lg p-3 mt-3 flex items-center justify-between">
                                          {service.backroom_config_dismissed ? (
                                            <div className="flex items-center gap-2 w-full justify-between">
                                              <span className="text-xs font-sans text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Configured
                                              </span>
                                              <button
                                                className="text-xs font-sans text-muted-foreground hover:text-foreground underline underline-offset-2"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateService.mutate({ id: service.id, updates: { backroom_config_dismissed: false } });
                                                }}
                                              >
                                                Undo
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <p className="text-xs font-sans text-muted-foreground">
                                                Review complete? Mark as configured to track setup progress.
                                              </p>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateService.mutate({ id: service.id, updates: { backroom_config_dismissed: true } });
                                                  setTimeout(() => {
                                                    setExpandedIds(prev => {
                                                      const next = new Set(prev);
                                                      next.delete(service.id);
                                                      return next;
                                                    });
                                                  }, 400);
                                                }}
                                              >
                                                <ChevronRight className="w-3.5 h-3.5 animate-nudge-right" />
                                                Finalize Configuration
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      /* Untracked service drill-down */
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-3">
                                              <span>Category: <span className="text-foreground">{service.category || 'None'}</span></span>
                                              <span>Type: <span className="text-foreground capitalize">{type}</span></span>
                                            </div>
                                            {(type === 'chemical' || type === 'suggested') && !service.is_chemical_service && (
                                              <p className="text-amber-600 dark:text-amber-400">This service appears to use chemicals — consider enabling tracking.</p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs shrink-0"
                                            onClick={() => toggleTracking.mutate({ id: service.id, tracked: true })}
                                          >
                                            Enable Tracking
                                          </Button>
                                          </div>
                                        </div>
                                        {/* Chemical toggle for untracked services */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                          <label className="text-[10px] font-sans text-muted-foreground whitespace-nowrap">Color / Chemical</label>
                                          <Switch
                                            checked={service.is_chemical_service}
                                            onCheckedChange={(v) => {
                                              if (v) {
                                                const containers = (service.container_types?.length) ? service.container_types : ['bowl'] as ('bowl' | 'bottle')[];
                                                updateService.mutate({ id: service.id, updates: { is_chemical_service: true, is_backroom_tracked: true, container_types: containers } });
                                              } else {
                                                updateService.mutate({ id: service.id, updates: { is_chemical_service: false, container_types: [] } });
                                              }
                                            }}
                                          />
                                          <span className="text-[10px] text-muted-foreground/60 font-sans">Enabling also turns on tracking</span>
                                        </div>
                                        {/* Mark Configured footer for untracked */}
                                        {(type === 'chemical' || type === 'suggested') && (
                                          <div className="bg-primary/5 border-t border-primary/20 rounded-b-lg p-3 mt-3 flex items-center justify-between">
                                            {service.backroom_config_dismissed ? (
                                              <div className="flex items-center gap-2 w-full justify-between">
                                                <span className="text-xs font-sans text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                  Reviewed
                                                </span>
                                                <button
                                                  className="text-xs font-sans text-muted-foreground hover:text-foreground underline underline-offset-2"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateService.mutate({ id: service.id, updates: { backroom_config_dismissed: false } });
                                                  }}
                                                >
                                                  Undo
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <p className="text-xs font-sans text-muted-foreground">
                                                  Doesn't need tracking? Mark as reviewed.
                                                </p>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 text-xs shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateService.mutate({ id: service.id, updates: { backroom_config_dismissed: true } });
                                                    setTimeout(() => {
                                                      setExpandedIds(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(service.id);
                                                        return next;
                                                      });
                                                    }, 400);
                                                  }}
                                                >
                                                  <ChevronRight className="w-3.5 h-3.5 animate-nudge-right" />
                                                  Finalize Configuration
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                   </motion.div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                      </React.Fragment>
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
          allowanceByService={allowanceByService}
          onNavigateAllowances={onNavigate ? () => onNavigate('allowances') : undefined}
        />
      )}

      {calculatorServiceId && (
        <AllowanceCalculatorDialog
          open={!!calculatorServiceId}
          onOpenChange={(open) => { if (!open) setCalculatorServiceId(null); }}
          serviceId={calculatorServiceId}
          serviceName={calculatorServiceName}
          containerTypes={calculatorContainerTypes}
          servicePrice={calculatorServicePrice}
        />
      )}
    </div>
  );
}

