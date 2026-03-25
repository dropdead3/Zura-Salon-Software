/**
 * ServiceTrackingQuickSetup — Stepped wizard dialog for service tracking configuration.
 * Walks through: Classify → Track → Map Components → Set Allowances.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpsertTrackingComponent } from '@/hooks/backroom/useServiceTrackingComponents';
import { isSuggestedChemicalService } from '@/utils/serviceCategorization';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ChevronRight, SkipForward, Beaker, Layers, Package, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProgressMilestone } from './ServiceTrackingProgressBar';

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  is_backroom_tracked: boolean;
  is_chemical_service: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  services: ServiceRow[];
  milestones: ProgressMilestone[];
  componentsByService: Map<string, number>;
  allowanceByService: Map<string, unknown>;
  onNavigateAllowances?: () => void;
}

const STEPS = [
  { key: 'classify', label: 'Classify Services', icon: Beaker, description: 'Mark services as requiring color/chemical or not.' },,
  { key: 'track', label: 'Enable Tracking', icon: Layers, description: 'Turn on backroom tracking for chemical services.' },
  { key: 'components', label: 'Map Components', icon: Package, description: 'Link products to tracked services.' },
  { key: 'allowances', label: 'Set Allowances', icon: FileText, description: 'Configure billing allowances for tracked services.' },
] as const;

export function ServiceTrackingQuickSetup({
  open, onOpenChange, orgId, services, milestones, componentsByService, allowanceByService, onNavigateAllowances,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [classifications, setClassifications] = useState<Record<string, boolean>>({});
  const [isSavingClassify, setIsSavingClassify] = useState(false);
  const queryClient = useQueryClient();
  const upsertComponent = useUpsertTrackingComponent();

  // Pre-populate local classifications from DB state
  const classifyInitKey = services.map(s => `${s.id}:${s.is_chemical_service}`).join(',');
  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const s of services) {
      if (s.is_chemical_service !== null) init[s.id] = s.is_chemical_service;
    }
    setClassifications(init);
  }, [classifyInitKey]);

  const step = STEPS[currentStep];
  const milestone = milestones[currentStep];
  const stepPct = milestone && milestone.total > 0 ? Math.round((milestone.current / milestone.total) * 100) : 0;




  const trackMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('services').update({ is_backroom_tracked: true }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      toast.success('Services tracked');
    },
    onError: (e) => toast.error(e.message),
  });

  // Step-specific items
  const untrackedChemical = services.filter(s =>
    !s.is_backroom_tracked && (s.is_chemical_service || isSuggestedChemicalService(s.name, s.category))
  );
  const trackedNoComponents = services.filter(s => s.is_backroom_tracked && !componentsByService.has(s.id));
  const trackedNoAllowance = services.filter(s => s.is_backroom_tracked && !allowanceByService.has(s.id));

  const next = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else onOpenChange(false);
  };

  // Batch-save classify step: only update services whose local state differs from DB
  const saveClassificationsAndNext = useCallback(async () => {
    const updates: { id: string; isChemical: boolean }[] = [];
    for (const s of services) {
      const local = classifications[s.id];
      if (local !== undefined && local !== s.is_chemical_service) {
        updates.push({ id: s.id, isChemical: local });
      }
    }
    if (updates.length === 0) {
      next();
      return;
    }
    setIsSavingClassify(true);
    try {
      for (const u of updates) {
        const { error } = await supabase.from('services').update({ is_chemical_service: u.isChemical }).eq('id', u.id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      toast.success(`${updates.length} service${updates.length > 1 ? 's' : ''} classified`);
      next();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setIsSavingClassify(false);
    }
  }, [services, classifications, currentStep]);

  // Count how many local classifications differ from DB (dirty count)
  const classifyDirtyCount = useMemo(() => {
    let count = 0;
    for (const s of services) {
      const local = classifications[s.id];
      if (local !== undefined && local !== s.is_chemical_service) count++;
    }
    return count;
  }, [services, classifications]);

  // How many are still unclassified (no local selection either)
  const unclassifiedCount = services.filter(s => s.is_chemical_service === null && classifications[s.id] === undefined).length;

  const renderStepContent = () => {
    switch (step.key) {
      case 'classify':
        return (
          <div className="space-y-2">
            <p className={cn(tokens.body.muted, 'text-xs mb-2')}>
              Classify each service as Standard or Chemical, then save.
            </p>
            {services.map(s => {
              const localVal = classifications[s.id];
              const isStandard = localVal === false;
              const isChemical = localVal === true;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-sans truncate">{s.name}</span>
                    {isSuggestedChemicalService(s.name, s.category) && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 shrink-0">Suggested</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant={isStandard ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-7 px-3 text-xs font-sans"
                      onClick={() => setClassifications(prev => ({ ...prev, [s.id]: false }))}
                    >
                      Standard
                    </Button>
                    <Button
                      variant={isChemical ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-3 text-xs font-sans"
                      onClick={() => setClassifications(prev => ({ ...prev, [s.id]: true }))}
                    >
                      Chemical
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'track':
        return (
           <div className="space-y-2">
            {untrackedChemical.length === 0 ? (
              <StepComplete message="All chemical services are being tracked." />
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <Button size="sm" onClick={() => trackMutation.mutate(untrackedChemical.map(s => s.id))} disabled={trackMutation.isPending}>
                    Track All ({untrackedChemical.length})
                  </Button>
                </div>
                {untrackedChemical.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-sans truncate">{s.name}</span>
                    <Switch
                      checked={false}
                      onCheckedChange={() => trackMutation.mutate([s.id])}
                      className="scale-90"
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        );

      case 'components':
        return (
          <div className="space-y-2">
            {trackedNoComponents.length === 0 ? (
              <StepComplete message="All tracked services have components mapped." />
            ) : (
              <>
                <p className={cn(tokens.body.muted, 'text-xs mb-2')}>
                  These tracked services need at least one product component.
                </p>
                {trackedNoComponents.map(s => (
                  <WizardComponentRow key={s.id} serviceId={s.id} serviceName={s.name} orgId={orgId} upsertComponent={upsertComponent} />
                ))}
              </>
            )}
          </div>
        );

      case 'allowances':
        return (
          <div className="space-y-2">
            {trackedNoAllowance.length === 0 ? (
              <StepComplete message="All tracked services have allowance policies." />
            ) : (
              <>
                <p className={cn(tokens.body.muted, 'text-xs mb-2')}>
                  {trackedNoAllowance.length} tracked service{trackedNoAllowance.length > 1 ? 's' : ''} need{trackedNoAllowance.length === 1 ? 's' : ''} an allowance policy.
                </p>
                {trackedNoAllowance.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-sans truncate">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">No policy</Badge>
                  </div>
                ))}
                {onNavigateAllowances && (
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { onOpenChange(false); onNavigateAllowances(); }}>
                    Go to Allowance Configuration
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </>
            )}
          </div>
        );
    }
  };

  const isClassifyStep = step.key === 'classify';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Fixed header */}
        <div className="p-6 pb-4 space-y-3 shrink-0">
          <DialogHeader>
            <DialogTitle className={tokens.card.title}>Quick Setup</DialogTitle>
            <DialogDescription className={tokens.body.muted}>
              Walk through configuration step by step.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = milestones[i] && milestones[i].current === milestones[i].total && milestones[i].total > 0;
              return (
                <button
                  key={s.key}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans transition-colors border',
                    i === currentStep
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : done
                        ? 'bg-primary/5 border-primary/20 text-primary/70'
                        : 'bg-muted/50 border-border text-muted-foreground',
                  )}
                >
                  {done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Step progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-muted-foreground">{step.description}</span>
              <span className="text-xs font-sans tabular-nums text-muted-foreground">{milestone?.current}/{milestone?.total}</span>
            </div>
            <Progress value={stepPct} className="h-1.5" />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-2">
          {renderStepContent()}
        </div>

        {/* Fixed footer */}
        <div className="flex items-center justify-between p-6 pt-3 border-t border-border/50 shrink-0">
          <Button variant="ghost" size="sm" onClick={next} className="text-xs text-muted-foreground">
            <SkipForward className="w-3 h-3 mr-1" />
            {currentStep < STEPS.length - 1 ? 'Skip' : 'Close'}
          </Button>
          {isClassifyStep ? (
            <Button size="sm" onClick={saveClassificationsAndNext} disabled={isSavingClassify}>
              {isSavingClassify && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {classifyDirtyCount > 0 ? `Save & Next (${classifyDirtyCount})` : 'Next Step'}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={next}>
              {currentStep < STEPS.length - 1 ? 'Next Step' : 'Done'}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepComplete({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <CheckCircle2 className="w-8 h-8 text-primary/60" />
      <p className="text-sm font-sans text-muted-foreground">{message}</p>
    </div>
  );
}

function WizardComponentRow({ serviceId, serviceName, orgId, upsertComponent }: {
  serviceId: string;
  serviceName: string;
  orgId: string;
  upsertComponent: ReturnType<typeof useUpsertTrackingComponent>;
}) {
  const [adding, setAdding] = useState(false);

  const { data: backroomProducts } = useQuery({
    queryKey: ['backroom-products-for-mapping', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_backroom_tracked', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!orgId,
  });

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-sans truncate">{serviceName}</span>
        {!adding && (
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setAdding(true)}>
            Add Product
          </Button>
        )}
      </div>
      {adding && (
        <Select
          onValueChange={(productId) => {
            upsertComponent.mutate({ organization_id: orgId, service_id: serviceId, product_id: productId });
            setAdding(false);
          }}
        >
          <SelectTrigger className="w-full text-xs h-8">
            <SelectValue placeholder="Select product..." />
          </SelectTrigger>
          <SelectContent>
            {(backroomProducts || []).map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
