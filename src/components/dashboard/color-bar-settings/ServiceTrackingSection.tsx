import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

import { useServiceAllowancePolicies, useUpsertAllowancePolicy, useDeleteAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { isSuggestedChemicalService } from '@/utils/serviceCategorization';
import { useIsMobile } from '@/hooks/use-mobile';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Loader2, Wrench, Plus, Zap, ArrowRight, CircleDot, AlertTriangle, FileText, ChevronDown, ChevronRight, Search, CheckCircle2, RotateCcw, Check, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { ServiceTrackingProgressBar, type ProgressMilestone } from './ServiceTrackingProgressBar';
import { ServiceTrackingQuickSetup } from './ServiceTrackingQuickSetup';
import { AllowanceCalculatorDialog } from './AllowanceCalculatorDialog';
import { PriceRecommendationCard } from './PriceRecommendationCard';
import { useComputedPriceRecommendations, useAcceptPriceRecommendation, useDismissPriceRecommendation } from '@/hooks/color-bar/useServicePriceRecommendations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  is_backroom_tracked: boolean;
  is_chemical_service: boolean | null;
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | null>(null);
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const [allowanceEditing, setAllowanceEditing] = useState<Set<string>>(new Set());
  const [allowanceDraft, setAllowanceDraft] = useState<Record<string, { qty: number; rate: string }>>({});
  const upsertPolicy = useUpsertAllowancePolicy();
  const deletePolicy = useDeleteAllowancePolicy();
  const [calculatorServiceId, setCalculatorServiceId] = useState<string | null>(null);
  const [calculatorServiceName, setCalculatorServiceName] = useState('');
  const [calculatorContainerTypes, setCalculatorContainerTypes] = useState<('bowl' | 'bottle')[]>(['bowl']);
  const [calculatorServicePrice, setCalculatorServicePrice] = useState<number | null>(null);

  // Price recommendations
  const { data: priceRecommendations } = useComputedPriceRecommendations();
  const acceptPriceRec = useAcceptPriceRecommendation();
  const dismissPriceRec = useDismissPriceRecommendation();
  const priceRecMap = useMemo(() => {
    const map = new Map<string, import('@/lib/color-bar/price-recommendation').PriceRecommendation>();
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
      if (deltaY > 0 && !next.has(id)) next.add(id);
      else if (deltaY < 0 && next.has(id)) next.delete(id);
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
    queryKey: ['color-bar-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, price, is_backroom_tracked, is_chemical_service, backroom_config_dismissed, container_types')
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
      const updates = tracked
        ? { is_backroom_tracked: true, is_chemical_service: true, container_types: ['bowl'] as ('bowl' | 'bottle')[] }
        : { is_backroom_tracked: false, is_chemical_service: false, container_types: [] as ('bowl' | 'bottle')[] };
      const { error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-services'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (variables.tracked) {
          next.add(variables.id);
        } else {
          next.delete(variables.id);
          const orphanedPolicy = allowanceByService.get(variables.id);
          if (orphanedPolicy) {
            deletePolicy.mutate(orphanedPolicy.id);
          }
        }
        return next;
      });
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
      queryClient.invalidateQueries({ queryKey: ['color-bar-services'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      setSelectedIds(new Set());
      toast.success('Services tracked successfully');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceRow> }) => {
      const svc = (services || []).find(s => s.id === id);
      const didResetConfig = !!(svc?.backroom_config_dismissed && !('backroom_config_dismissed' in updates));
      if (didResetConfig) {
        updates.backroom_config_dismissed = false;
      }
      const { error } = await supabase
        .from('services')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
      if (updates.container_types && orgId && svc?.name) {
        // Update container_types on the native services table only
        await supabase
          .from('services')
          .update({ container_types: updates.container_types } as Record<string, unknown>)
          .eq('name', svc.name)
          .eq('organization_id', orgId);
      }
      return { didResetConfig };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-services'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
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

  const [resetConfirmServiceId, setResetConfirmServiceId] = useState<string | null>(null);

  const confirmReset = useCallback((serviceId: string) => {
    setResetConfirmServiceId(serviceId);
  }, []);

  const executeReset = useCallback(async () => {
    const serviceId = resetConfirmServiceId;
    if (!serviceId) return;
    setResetConfirmServiceId(null);
    try {
      const { error: svcErr } = await supabase
        .from('services')
        .update({
          is_backroom_tracked: false,
          is_chemical_service: false,
          container_types: [],
          backroom_config_dismissed: false,
        } as Record<string, unknown>)
        .eq('id', serviceId);
      if (svcErr) throw svcErr;

      const policy = allowanceByService.get(serviceId);
      if (policy) {
        await deletePolicy.mutateAsync(policy.id);
      }

      if (orgId) {
        const { error: baseErr } = await supabase
          .from('service_recipe_baselines')
          .delete()
          .eq('service_id', serviceId)
          .eq('organization_id', orgId);
        if (baseErr) throw baseErr;
      }

      queryClient.invalidateQueries({ queryKey: ['color-bar-services'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['org-services'] });
      queryClient.invalidateQueries({ queryKey: ['service-lookup-map'] });
      queryClient.invalidateQueries({ queryKey: ['service-allowance-policies'] });
      queryClient.invalidateQueries({ queryKey: ['service-recipe-baselines'] });

      setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });

      toast.success('Service reset to unconfigured');
    } catch (err: any) {
      toast.error('Failed to reset: ' + err.message);
    }
  }, [resetConfirmServiceId, allowanceByService, deletePolicy, orgId, queryClient]);

  // Classification helpers
  const getServiceType = (s: ServiceRow): 'chemical' | 'suggested' | 'standard' => {
    if (s.is_chemical_service === true) return 'chemical';
    if (s.is_chemical_service === null && isSuggestedChemicalService(s.name, s.category)) return 'suggested';
    return 'standard';
  };

  const isTrulyConfigured = useCallback((s: ServiceRow): boolean => {
    if (!s.backroom_config_dismissed) return false;
    const policy = allowanceByService.get(s.id);
    if (!policy) return true;
    if (policy.billing_mode === 'parts_and_labor') return true;
    if (policy.billing_mode === 'allowance') {
      return policy.is_active === true && (policy.included_allowance_qty > 0 || policy.overage_rate > 0);
    }
    return false;
  }, [allowanceByService]);

  const needsAttention = (s: ServiceRow): boolean => {
    if (isTrulyConfigured(s)) return false;
    const type = getServiceType(s);
    if ((type === 'chemical' || type === 'suggested') && !s.is_backroom_tracked) return true;
    if (s.is_backroom_tracked && !allowanceByService.has(s.id)) return true;
    if (s.is_backroom_tracked) {
      const p = allowanceByService.get(s.id);
      if (p && (p.billing_mode === null || p.billing_mode === undefined)) return true;
      if (p && p.billing_mode === 'allowance' && p.included_allowance_qty === 0 && p.overage_rate === 0) return true;
    }
    return false;
  };

  // Progress milestones
  const milestones: ProgressMilestone[] = useMemo(() => {
    const chemicalOrSuggested = allServices.filter(s => getServiceType(s) !== 'standard');
    const tracked = allServices.filter(s => s.is_backroom_tracked);
    const withPolicy = tracked.filter(s => {
      const p = allowanceByService.get(s.id);
      return p && p.billing_mode !== null && p.billing_mode !== undefined;
    });
    const configured = tracked.filter(s => {
      const policy = allowanceByService.get(s.id);
      return policy?.is_active === true;
    });

    return [
      {
        label: 'Track Services',
        current: tracked.length,
        total: chemicalOrSuggested.length,
        tooltip: 'Enable color bar tracking for services that use color or chemical products.',
      },
      {
        label: 'Set Billing Method',
        current: withPolicy.length,
        total: tracked.length,
        tooltip: 'Choose how each service is billed — Allowance (recipe-based) or Parts & Labor (cost pass-through).',
      },
      {
        label: 'Configure Allowances',
        current: configured.length,
        total: tracked.length,
        tooltip: 'Build recipes for allowance services or confirm pass-through settings for Parts & Labor services.',
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

  // Search filter
  const searchedServices = useMemo(() => {
    let list = filteredServices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
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

  // Group services by category
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, { services: ServiceRow[]; configured: number; tracked: number }>();
    for (const s of searchedServices) {
      const cat = s.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, { services: [], configured: 0, tracked: 0 });
      const g = groups.get(cat)!;
      g.services.push(s);
      if (isTrulyConfigured(s)) g.configured++;
      if (s.is_backroom_tracked) g.tracked++;
    }
    return groups;
  }, [searchedServices, allowanceByService]);

  // Initialize collapsedCategories
  useEffect(() => {
    if (collapsedCategories === null && categoryGroups.size > 0) {
      setCollapsedCategories(new Set(categoryGroups.keys()));
    }
  }, [categoryGroups, collapsedCategories]);

  // Auto-expand all categories when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      setCollapsedCategories(new Set());
    }
  }, [searchQuery]);

  // Auto-reset stale backroom_config_dismissed flags
  useEffect(() => {
    if (!orgId || !allServices.length) return;
    const staleServices = allServices.filter(s => {
      if (!s.backroom_config_dismissed) return false;
      const policy = allowanceByService.get(s.id);
      if (!policy) return false;
      if (policy.billing_mode === 'allowance' && policy.included_allowance_qty === 0 && policy.overage_rate === 0) return true;
      return false;
    });
    if (staleServices.length === 0) return;
    (async () => {
      for (const s of staleServices) {
        await supabase
          .from('services')
          .update({ backroom_config_dismissed: false })
          .eq('id', s.id);
      }
      queryClient.invalidateQueries({ queryKey: ['services'] });
    })();
  }, [orgId, allServices, allowanceByService, queryClient]);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev ?? []);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

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

  // ─── Shared detail panel renderer (used by both table and card modes) ───
  const renderDetailPanel = (service: ServiceRow) => {
    const type = getServiceType(service);
    return (
      <div className="@[500px]:px-6 px-4 py-4 bg-muted/30 border-t border-border/30">
        {/* Toggle row — visible only at narrow container widths */}
        <div className="@[600px]:hidden flex items-center justify-between py-3 border-b border-border/30 mb-4" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs font-sans text-muted-foreground">Enable Product Billing</span>
          <Switch
            checked={service.is_backroom_tracked}
            onCheckedChange={(v) => toggleTracking.mutate({ id: service.id, tracked: v })}
            className="scale-90 shrink-0"
          />
        </div>
        {service.is_backroom_tracked ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 @[900px]:grid-cols-2 gap-5">
              {/* ─── Section 1: Tracking ─── */}
              <div>
                <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">Tracking</p>
                <div className="pl-3 border-l border-border/40">
                  <div className="flex flex-wrap items-center gap-4">
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
                                'px-3 py-1 rounded-full text-xs font-sans capitalize transition-colors border flex items-center gap-1 ',
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
                  </div>
                </div>
              </div>

              {/* ─── Section 2: Billing Method ─── */}
              {(service.container_types || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">Billing Method</p>
                  <div className="pl-3 border-l border-border/40">
                    {(() => {
                      const policy = allowanceByService.get(service.id);
                      const billingMode = policy?.billing_mode ?? null;
                      return (
                        <div className="space-y-2">
                          {/* Billing mode toggle — stacks vertically at <500px */}
                          <div className="flex items-center gap-1.5 @[500px]:flex-row flex-col @[500px]:items-center items-stretch">
                            <span className="text-xs font-sans text-muted-foreground @[500px]:inline hidden">Billing:</span>
                            <span className="text-xs font-sans text-muted-foreground @[500px]:hidden mb-1">Billing:</span>
                            {(['allowance', 'parts_and_labor'] as const).map((mode, idx) => {
                              const active = billingMode !== null && billingMode === mode;
                              return (
                                <React.Fragment key={mode}>
                                  {idx === 1 && (
                                    <span className="text-xs font-sans text-muted-foreground/60 select-none @[500px]:inline hidden">or</span>
                                  )}
                                  <button
                                    className={cn(
                                      'px-3 py-1 rounded-full text-xs font-sans capitalize transition-colors border flex items-center gap-1 justify-center ',
                                      active
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-transparent border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground'
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (active) {
                                        const existingPolicy = allowanceByService.get(service.id);
                                        if (existingPolicy) {
                                          deletePolicy.mutate(existingPolicy.id);
                                        }
                                      } else {
                                        upsertPolicy.mutate({
                                          organization_id: effectiveOrganization!.id,
                                          service_id: service.id,
                                          billing_mode: mode,
                                          is_active: mode === 'parts_and_labor' ? true : (policy?.is_active ?? false),
                                          included_allowance_qty: policy?.included_allowance_qty ?? 0,
                                          overage_rate: policy?.overage_rate ?? 0,
                                          overage_rate_type: policy?.overage_rate_type ?? 'per_unit',
                                          overage_cap: policy?.overage_cap ?? null,
                                          notes: policy?.notes ?? null,
                                        });
                                      }
                                    }}
                                  >
                                    {active ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                    {mode === 'allowance' ? 'Allowance' : 'Parts & Labor'}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {/* Mode-specific content */}
                          {billingMode === null ? (
                            <p className="text-xs font-sans text-muted-foreground italic pl-1">Select a billing method above.</p>
                          ) : billingMode === 'parts_and_labor' ? (
                            <div className="flex items-center gap-2 text-xs">
                              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="font-sans text-muted-foreground">
                                Parts & Labor — client pays hourly rate + retail cost of supplies. No allowance needed.
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              {(() => {
                                const hasConfiguredValues = policy && (policy.included_allowance_qty > 0 || policy.overage_rate > 0);
                                if (policy && policy.is_active && hasConfiguredValues) {
                                  const recipeNote = policy.notes?.startsWith('Recipe-based:') ? policy.notes.replace('Recipe-based: ', '') : null;
                                  const healthStatus = policy.allowance_health_status;
                                  const healthPct = policy.allowance_health_pct;
                                  return (
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
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
                                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1.5 w-full">
                                    <p className="text-xs font-sans text-amber-700 dark:text-amber-300/80">
                                      Set a product allowance to calculate overage billing for this service.
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-amber-500 text-amber-950 hover:bg-amber-400 font-sans gap-1.5 rounded-full @[500px]:w-auto w-full"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCalculatorServiceId(service.id);
                                          setCalculatorServiceName(service.name);
                                          setCalculatorContainerTypes((service.container_types || ['bowl']) as ('bowl' | 'bottle')[]);
                                          setCalculatorServicePrice(service.price);
                                        }}
                                      >
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-200" />
                                        </span>
                                        Configure Allowance
                                        <ArrowRight className="w-3 h-3" />
                                      </Button>
                                      <MetricInfoTooltip description="Use benchmark products to set a dollar allowance for this service. Stylists can mix any product — once the allowance is reached, overage costs are passed to the client at checkout." />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
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

            {/* Mark Configured footer — stacks at <500px */}
            <div className="bg-amber-500/5 border-t border-amber-500/20 rounded-b-lg p-3 mt-3 @[500px]:flex-row flex-col @[500px]:items-center items-stretch flex justify-between gap-2">
              {isTrulyConfigured(service) ? (
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="text-xs font-sans text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Configured
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 @[500px]:h-7 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmReset(service.id);
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Configuration
                  </Button>
                </div>
              ) : (() => {
                const fPolicy = allowanceByService.get(service.id);
                const fBillingMode = fPolicy?.billing_mode ?? null;
                const hasConfiguredAllowance = fPolicy && (fPolicy.included_allowance_qty > 0 || fPolicy.overage_rate > 0) && fPolicy.is_active;
                const canFinalize = fBillingMode === 'parts_and_labor' || (fBillingMode === 'allowance' && hasConfiguredAllowance);

                const hintText = fBillingMode === null
                  ? 'Select a billing method to finalize.'
                  : fBillingMode === 'allowance' && !hasConfiguredAllowance
                    ? 'Configure allowance to finalize.'
                    : 'Review complete? Mark as configured to track setup progress.';

                return (
                  <>
                    <p className="text-xs font-sans text-muted-foreground">
                      {hintText}
                    </p>
                    <div className="flex @[500px]:flex-row @[500px]:items-center @[500px]:justify-end @[500px]:gap-2 flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="@[500px]:h-7 @[500px]:w-auto @[500px]:rounded-full h-10 w-full rounded-full text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-border/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmReset(service.id);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        disabled={!canFinalize}
                        className={cn(
                          "@[500px]:h-7 @[500px]:w-auto @[500px]:rounded-full h-10 w-full rounded-full text-xs",
                          canFinalize
                            ? "bg-amber-500/90 text-amber-950 hover:bg-amber-400 dark:bg-amber-500/80 dark:hover:bg-amber-400/80"
                            : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canFinalize) return;
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
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          /* Untracked service drill-down */
          <div className="space-y-3">
            {/* Toggle row for narrow widths — untracked state */}
            <div className="@[600px]:hidden flex items-center justify-between py-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-sans text-muted-foreground">Enable Product Billing</span>
              <Switch
                checked={service.is_backroom_tracked}
                onCheckedChange={(v) => toggleTracking.mutate({ id: service.id, tracked: v })}
                className="scale-90 shrink-0"
              />
            </div>
            {(type === 'chemical' || type === 'suggested') && !service.is_chemical_service && (
              <p className="text-xs text-amber-600 dark:text-amber-400">This service appears to use chemicals — consider enabling tracking.</p>
            )}
            {/* Mark Configured footer for untracked */}
            {(type === 'chemical' || type === 'suggested') && (
              <div className="bg-primary/5 border-t border-primary/20 rounded-b-lg p-3 mt-3 @[500px]:flex-row flex-col @[500px]:items-center items-stretch flex justify-between gap-2">
                {service.backroom_config_dismissed ? (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="text-xs font-sans text-green-600 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reviewed
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 @[500px]:h-7 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmReset(service.id);
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Configuration
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-sans text-muted-foreground">
                      Doesn't need tracking? Mark as reviewed.
                    </p>
                    <div className="flex @[500px]:flex-row @[500px]:items-center @[500px]:justify-end @[500px]:gap-2 flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="@[500px]:h-7 @[500px]:w-auto @[500px]:rounded-full h-10 w-full rounded-full text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-border/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmReset(service.id);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        className="@[500px]:h-7 @[500px]:w-auto @[500px]:rounded-full h-10 w-full rounded-full text-xs bg-amber-500/90 text-amber-950 hover:bg-amber-400 dark:bg-amber-500/80 dark:hover:bg-amber-400/80"
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
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Service badges renderer (shared) ───
  const renderServiceBadges = (service: ServiceRow) => {
    const type = getServiceType(service);
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        {service.category && (
          <span className="text-[11px] text-muted-foreground">{service.category}</span>
        )}
        {type === 'suggested' && (
          <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400 py-0 px-1.5">Suggested</Badge>
        )}
        {isTrulyConfigured(service) ? (
          <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 py-0 px-1.5">Configured ✓</Badge>
        ) : service.is_backroom_tracked ? (
          <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 py-0 px-1.5">Unconfigured</Badge>
        ) : null}
        {(() => {
          const policy = allowanceByService?.get(service.id);
          if (!policy) return null;
          if (policy.is_active && policy.billing_mode === 'parts_and_labor') {
            return <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400 py-0 px-1.5">Parts & Labor</Badge>;
          }
          if (policy.is_active) {
            const dollarMatch = policy.notes?.match(/\$(\d+\.?\d*)/);
            if (dollarMatch && policy.included_allowance_qty > 0) {
              return <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 border-border/60 py-0 px-1.5">${dollarMatch[1]} Allowance</Badge>;
            }
          }
          return null;
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-6 @container">
      <PageExplainer pageId="color-bar-services" />

      {/* Configuration Progress */}
      <ServiceTrackingProgressBar milestones={milestones} onQuickSetup={() => setWizardOpen(true)} />

      {/* Auto-detect banner — stacks at <500px */}
      {chemicalUntracked.length > 0 && (
        <div className="flex @[500px]:flex-row flex-col @[500px]:items-center items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <p className={cn(tokens.body.muted, 'flex-1')}>
              <span className="text-foreground font-sans font-medium">{chemicalUntracked.length} color/chemical service{chemicalUntracked.length > 1 ? 's' : ''}</span>{' '}
              detected but not yet tracked.
            </p>
          </div>
          <Button
            size="sm"
            className="@[500px]:w-auto w-full shrink-0"
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={tokens.card.iconBox}>
                <Wrench className={tokens.card.icon} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>All Services</CardTitle>
                  <MetricInfoTooltip description="Complete view of all active services. Toggle tracking, view configuration status, and identify gaps." />
                </div>
                <CardDescription>
                  {filterCounts.tracked} tracked · {filterCounts.untracked} untracked · {filterCounts.attention > 0 && (
                    <span className="text-amber-500">{filterCounts.attention} need attention</span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Track Selected — hidden at <600px, replaced by sticky bar */}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  className="hidden @[600px]:inline-flex"
                  onClick={() => bulkTrackMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkTrackMutation.isPending}
                >
                  Track Selected ({selectedIds.size})
                </Button>
              )}
              {/* Services Configurator — full at ≥700px, icon-only at <700px */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="@[700px]:hidden"
                      onClick={() => navigate(dashPath('/admin/settings?category=services'))}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Services Configurator</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="outline"
                size="sm"
                className="hidden @[700px]:inline-flex"
                onClick={() => navigate(dashPath('/admin/settings?category=services'))}
              >
                Services Configurator
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Filter tabs — search above filters at narrow, right-aligned at wide */}
          <div className="flex flex-col-reverse gap-3 @[600px]:flex-row @[600px]:items-center @[600px]:justify-between">
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
              <div className="relative w-full @[600px]:w-56">
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

          {/* Content area */}
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
            <div className="@container rounded-lg border overflow-hidden relative">
              {/* ═══ DESKTOP TABLE VIEW (≥900px container) ═══ */}
              <div className="hidden @[900px]:block">
                <Table className="min-w-[400px]">
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
                      <TableHead className={cn(tokens.table.columnHeader, 'min-w-[180px]')}>Service</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right whitespace-nowrap')}>
                        Enable Product Billing
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(categoryGroups.entries()).map(([category, group]) => {
                      const isCollapsed = collapsedCategories?.has(category) ?? true;
                      const allConfigured = group.configured === group.services.length && group.services.length > 0;

                      return (
                        <React.Fragment key={`cat-${category}`}>
                          {/* Collapsible category header */}
                          <TableRow
                            className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleCategoryCollapse(category)}
                          >
                            <TableCell colSpan={4} className="py-2 px-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ChevronRight className={cn(
                                    'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0',
                                    !isCollapsed && 'rotate-90',
                                  )} />
                                  <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground truncate">
                                    {category}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] font-sans text-muted-foreground tabular-nums whitespace-nowrap">
                                    {group.services.length} service{group.services.length !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground/40">·</span>
                                  <span className={cn(
                                    'text-[11px] font-sans tabular-nums whitespace-nowrap',
                                    allConfigured ? 'text-emerald-500' : 'text-muted-foreground',
                                  )}>
                                    {group.configured} configured
                                  </span>
                                  {allConfigured && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Service rows */}
                          {!isCollapsed && group.services.map((service) => {
                            const attention = needsAttention(service);
                            const isExpanded = expandedIds.has(service.id);

                            return (
                              <React.Fragment key={service.id}>
                                <TableRow
                                  className={cn(
                                    attention && 'bg-amber-500/[0.03]',
                                    isTrulyConfigured(service) && 'bg-emerald-500/[0.04]',
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
                                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                    )}
                                  </TableCell>

                                  {/* Service — Name + badges */}
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
                                        {renderServiceBadges(service)}
                                      </div>
                                    </div>
                                  </TableCell>

                                  {/* Tracking toggle */}
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end">
                                      <Switch
                                        checked={service.is_backroom_tracked}
                                        onCheckedChange={(v) => toggleTracking.mutate({ id: service.id, tracked: v })}
                                        className="scale-90 shrink-0"
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
                                        >
                                          {renderDetailPanel(service)}
                                        </motion.div>
                                      </td>
                                    </motion.tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ═══ TABLET / MOBILE CARD VIEW (<900px container) ═══ */}
              <div className="@[900px]:hidden">
                {/* Select-all row for card mode */}
                {searchedServices.some(s => !s.is_backroom_tracked) && (
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-muted/30">
                    <Checkbox
                      checked={
                        searchedServices.filter(s => !s.is_backroom_tracked).length > 0 &&
                        searchedServices.filter(s => !s.is_backroom_tracked).every(s => selectedIds.has(s.id))
                      }
                      onCheckedChange={selectAll}
                    />
                    <span className="text-xs font-sans text-muted-foreground">Select all untracked</span>
                  </div>
                )}

                {Array.from(categoryGroups.entries()).map(([category, group]) => {
                  const isCollapsed = collapsedCategories?.has(category) ?? true;
                  const allConfigured = group.configured === group.services.length && group.services.length > 0;

                  return (
                    <div key={`card-cat-${category}`}>
                      {/* Category divider bar */}
                      <button
                        className="flex items-center justify-between gap-3 w-full px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border/50"
                        onClick={() => toggleCategoryCollapse(category)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0',
                            !isCollapsed && 'rotate-90',
                          )} />
                          <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground truncate">
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-sans text-muted-foreground tabular-nums whitespace-nowrap">
                            {group.services.length}
                          </span>
                          <span className="text-[11px] text-muted-foreground/40">·</span>
                          <span className={cn(
                            'text-[11px] font-sans tabular-nums whitespace-nowrap',
                            allConfigured ? 'text-emerald-500' : 'text-muted-foreground',
                          )}>
                            {group.configured}
                          </span>
                          {allConfigured && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* Service cards */}
                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'clip' }}
                          >
                            {group.services.map((service) => {
                              const attention = needsAttention(service);
                              const isExpanded = expandedIds.has(service.id);

                              return (
                                <div key={service.id}>
                                  {/* Card row */}
                                  <div
                                    className={cn(
                                      'flex items-start gap-3 px-4 py-3 border-b border-border/30 cursor-pointer transition-colors',
                                      attention && 'bg-amber-500/[0.03]',
                                      isTrulyConfigured(service) && 'bg-emerald-500/[0.04]',
                                      'hover:bg-muted/30 active:bg-muted/50',
                                    )}
                                    onClick={() => toggleExpand(service.id)}
                                    {...(isMobile ? {
                                      onTouchStart: (e: React.TouchEvent) => handleTouchStart(service.id, e),
                                      onTouchEnd: handleTouchEnd,
                                    } : {})}
                                  >
                                    {/* Checkbox / Status dot */}
                                    <div
                                      className="pt-0.5 shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {!service.is_backroom_tracked ? (
                                        <Checkbox
                                          checked={selectedIds.has(service.id)}
                                          onCheckedChange={() => toggleSelect(service.id)}
                                        />
                                      ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                                      )}
                                    </div>

                                    {/* Service info */}
                                    <div className="flex-1 min-w-0">
                                      <span className={cn(
                                        'text-sm font-sans',
                                        service.is_backroom_tracked ? 'text-foreground font-medium' : 'text-muted-foreground',
                                      )}>
                                        {service.name}
                                      </span>
                                      {renderServiceBadges(service)}
                                    </div>

                                    {/* Chevron */}
                                    <ChevronDown className={cn(
                                      'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 mt-0.5',
                                      isExpanded && 'rotate-180',
                                    )} />
                                  </div>

                                  {/* Expanded detail panel */}
                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                        style={{ overflow: 'clip' }}
                                      >
                                        <motion.div
                                          initial={{ opacity: 0, y: -8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -8 }}
                                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], delay: 0.08 }}
                                        >
                                          {renderDetailPanel(service)}
                                        </motion.div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* ═══ STICKY ACTION BAR (mobile, when services selected) ═══ */}
              {selectedIds.size > 0 && (
                <div className="@[600px]:hidden sticky bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg p-3 flex items-center justify-between gap-3 z-10">
                  <span className="text-xs font-sans text-muted-foreground">{selectedIds.size} selected</span>
                  <Button
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    onClick={() => bulkTrackMutation.mutate(Array.from(selectedIds))}
                    disabled={bulkTrackMutation.isPending}
                  >
                    Track Selected
                  </Button>
                </div>
              )}
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

      <AlertDialog open={!!resetConfirmServiceId} onOpenChange={(open) => { if (!open) setResetConfirmServiceId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-base tracking-wide">
              Reset Service Configuration
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all tracking, billing, and formula configuration for this service. It will return to a "Needs Attention" state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
