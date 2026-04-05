import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { 
  DollarSign, 
  ShoppingBag, 
  CalendarCheck, 
  Receipt, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2,
  ShieldCheck,
  Sparkles,
  Shield,
} from 'lucide-react';
import {
  useLevelPromotionCriteriaForLevel,
  useUpsertLevelPromotionCriteria,
  useDeleteLevelPromotionCriteria,
  type LevelPromotionCriteriaUpsert,
} from '@/hooks/useLevelPromotionCriteria';
import {
  useLevelRetentionCriteriaForLevel,
  useUpsertLevelRetentionCriteria,
  useDeleteLevelRetentionCriteria,
  type LevelRetentionCriteriaUpsert,
} from '@/hooks/useLevelRetentionCriteria';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface GraduationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelId: string;
  levelLabel: string;
  levelIndex: number;
  totalLevels: number;
}

interface CriterionConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  unit: string;
  enabledKey: keyof FormState;
  thresholdKey: keyof FormState;
  weightKey: keyof FormState;
  placeholder: string;
  step?: number;
}

interface FormState {
  revenue_enabled: boolean;
  revenue_threshold: number;
  retail_enabled: boolean;
  retail_pct_threshold: number;
  rebooking_enabled: boolean;
  rebooking_pct_threshold: number;
  avg_ticket_enabled: boolean;
  avg_ticket_threshold: number;
  tenure_enabled: boolean;
  tenure_days: number;
  revenue_weight: number;
  retail_weight: number;
  rebooking_weight: number;
  avg_ticket_weight: number;
  evaluation_window_days: number;
  requires_manual_approval: boolean;
}

interface RetentionFormState {
  retention_enabled: boolean;
  revenue_enabled: boolean;
  revenue_minimum: number;
  retail_enabled: boolean;
  retail_pct_minimum: number;
  rebooking_enabled: boolean;
  rebooking_pct_minimum: number;
  avg_ticket_enabled: boolean;
  avg_ticket_minimum: number;
  evaluation_window_days: number;
  grace_period_days: number;
  action_type: 'coaching_flag' | 'demotion_eligible';
}

const CRITERIA: CriterionConfig[] = [
  { key: 'revenue', label: 'Service Revenue', icon: DollarSign, unit: '/mo', enabledKey: 'revenue_enabled', thresholdKey: 'revenue_threshold', weightKey: 'revenue_weight', placeholder: '8000' },
  { key: 'retail', label: 'Retail Attachment', icon: ShoppingBag, unit: '%', enabledKey: 'retail_enabled', thresholdKey: 'retail_pct_threshold', weightKey: 'retail_weight', placeholder: '15' },
  { key: 'rebooking', label: 'Rebooking Rate', icon: CalendarCheck, unit: '%', enabledKey: 'rebooking_enabled', thresholdKey: 'rebooking_pct_threshold', weightKey: 'rebooking_weight', placeholder: '70' },
  { key: 'avg_ticket', label: 'Average Ticket', icon: Receipt, unit: '$', enabledKey: 'avg_ticket_enabled', thresholdKey: 'avg_ticket_threshold', weightKey: 'avg_ticket_weight', placeholder: '120' },
];

interface RetentionCriterionConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  unit: string;
  enabledKey: keyof RetentionFormState;
  minimumKey: keyof RetentionFormState;
  placeholder: string;
}

const RETENTION_CRITERIA: RetentionCriterionConfig[] = [
  { key: 'revenue', label: 'Service Revenue', icon: DollarSign, unit: '/mo', enabledKey: 'revenue_enabled', minimumKey: 'revenue_minimum', placeholder: '5000' },
  { key: 'retail', label: 'Retail Attachment', icon: ShoppingBag, unit: '%', enabledKey: 'retail_enabled', minimumKey: 'retail_pct_minimum', placeholder: '8' },
  { key: 'rebooking', label: 'Rebooking Rate', icon: CalendarCheck, unit: '%', enabledKey: 'rebooking_enabled', minimumKey: 'rebooking_pct_minimum', placeholder: '50' },
  { key: 'avg_ticket', label: 'Average Ticket', icon: Receipt, unit: '$', enabledKey: 'avg_ticket_enabled', minimumKey: 'avg_ticket_minimum', placeholder: '80' },
];

const INITIAL_STATE: FormState = {
  revenue_enabled: false,
  revenue_threshold: 0,
  retail_enabled: false,
  retail_pct_threshold: 0,
  rebooking_enabled: false,
  rebooking_pct_threshold: 0,
  avg_ticket_enabled: false,
  avg_ticket_threshold: 0,
  tenure_enabled: false,
  tenure_days: 0,
  revenue_weight: 0,
  retail_weight: 0,
  rebooking_weight: 0,
  avg_ticket_weight: 0,
  evaluation_window_days: 30,
  requires_manual_approval: false,
};

const INITIAL_RETENTION_STATE: RetentionFormState = {
  retention_enabled: false,
  revenue_enabled: false,
  revenue_minimum: 0,
  retail_enabled: false,
  retail_pct_minimum: 0,
  rebooking_enabled: false,
  rebooking_pct_minimum: 0,
  avg_ticket_enabled: false,
  avg_ticket_minimum: 0,
  evaluation_window_days: 90,
  grace_period_days: 30,
  action_type: 'coaching_flag',
};

const EVAL_WINDOWS = [30, 60, 90];
const GRACE_PERIODS = [14, 30, 60, 90];

function getZuraDefaults(levelIndex: number): FormState {
  if (levelIndex <= 1) {
    return {
      revenue_enabled: true, revenue_threshold: 6000,
      retail_enabled: true, retail_pct_threshold: 10,
      rebooking_enabled: true, rebooking_pct_threshold: 60,
      avg_ticket_enabled: false, avg_ticket_threshold: 0,
      tenure_enabled: false, tenure_days: 0,
      revenue_weight: 50, retail_weight: 25, rebooking_weight: 25, avg_ticket_weight: 0,
      evaluation_window_days: 30, requires_manual_approval: false,
    };
  }
  if (levelIndex === 2) {
    return {
      revenue_enabled: true, revenue_threshold: 8000,
      retail_enabled: true, retail_pct_threshold: 15,
      rebooking_enabled: true, rebooking_pct_threshold: 65,
      avg_ticket_enabled: true, avg_ticket_threshold: 110,
      tenure_enabled: false, tenure_days: 0,
      revenue_weight: 40, retail_weight: 20, rebooking_weight: 20, avg_ticket_weight: 20,
      evaluation_window_days: 60, requires_manual_approval: false,
    };
  }
  if (levelIndex === 3) {
    return {
      revenue_enabled: true, revenue_threshold: 12000,
      retail_enabled: true, retail_pct_threshold: 18,
      rebooking_enabled: true, rebooking_pct_threshold: 70,
      avg_ticket_enabled: true, avg_ticket_threshold: 140,
      tenure_enabled: true, tenure_days: 365,
      revenue_weight: 35, retail_weight: 20, rebooking_weight: 25, avg_ticket_weight: 20,
      evaluation_window_days: 60, requires_manual_approval: true,
    };
  }
  return {
    revenue_enabled: true, revenue_threshold: 16000,
    retail_enabled: true, retail_pct_threshold: 22,
    rebooking_enabled: true, rebooking_pct_threshold: 75,
    avg_ticket_enabled: true, avg_ticket_threshold: 170,
    tenure_enabled: true, tenure_days: 730,
    revenue_weight: 30, retail_weight: 20, rebooking_weight: 25, avg_ticket_weight: 25,
    evaluation_window_days: 90, requires_manual_approval: true,
  };
}

function getZuraRetentionDefaults(levelIndex: number): RetentionFormState {
  if (levelIndex <= 1) {
    return {
      retention_enabled: true,
      revenue_enabled: true, revenue_minimum: 4000,
      retail_enabled: true, retail_pct_minimum: 5,
      rebooking_enabled: true, rebooking_pct_minimum: 45,
      avg_ticket_enabled: false, avg_ticket_minimum: 0,
      evaluation_window_days: 90, grace_period_days: 30,
      action_type: 'coaching_flag',
    };
  }
  if (levelIndex === 2) {
    return {
      retention_enabled: true,
      revenue_enabled: true, revenue_minimum: 5500,
      retail_enabled: true, retail_pct_minimum: 8,
      rebooking_enabled: true, rebooking_pct_minimum: 50,
      avg_ticket_enabled: true, avg_ticket_minimum: 85,
      evaluation_window_days: 90, grace_period_days: 30,
      action_type: 'coaching_flag',
    };
  }
  if (levelIndex === 3) {
    return {
      retention_enabled: true,
      revenue_enabled: true, revenue_minimum: 8000,
      retail_enabled: true, retail_pct_minimum: 12,
      rebooking_enabled: true, rebooking_pct_minimum: 55,
      avg_ticket_enabled: true, avg_ticket_minimum: 100,
      evaluation_window_days: 90, grace_period_days: 30,
      action_type: 'demotion_eligible',
    };
  }
  return {
    retention_enabled: true,
    revenue_enabled: true, revenue_minimum: 10000,
    retail_enabled: true, retail_pct_minimum: 15,
    rebooking_enabled: true, rebooking_pct_minimum: 60,
    avg_ticket_enabled: true, avg_ticket_minimum: 120,
    evaluation_window_days: 90, grace_period_days: 30,
    action_type: 'demotion_eligible',
  };
}

export function GraduationWizard({ open, onOpenChange, levelId, levelLabel, levelIndex, totalLevels }: GraduationWizardProps) {
  const [activeTab, setActiveTab] = useState<'promotion' | 'retention'>('promotion');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [retForm, setRetForm] = useState<RetentionFormState>(INITIAL_RETENTION_STATE);

  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: existing, isLoading } = useLevelPromotionCriteriaForLevel(open ? levelId : undefined);
  const { data: existingRetention, isLoading: loadingRetention } = useLevelRetentionCriteriaForLevel(open ? levelId : undefined);
  const upsert = useUpsertLevelPromotionCriteria();
  const deleteCriteria = useDeleteLevelPromotionCriteria();
  const upsertRetention = useUpsertLevelRetentionCriteria();
  const deleteRetention = useDeleteLevelRetentionCriteria();

  // Hydrate promotion form
  useEffect(() => {
    if (existing) {
      setForm({
        revenue_enabled: existing.revenue_enabled,
        revenue_threshold: existing.revenue_threshold,
        retail_enabled: existing.retail_enabled,
        retail_pct_threshold: existing.retail_pct_threshold,
        rebooking_enabled: existing.rebooking_enabled,
        rebooking_pct_threshold: existing.rebooking_pct_threshold,
        avg_ticket_enabled: existing.avg_ticket_enabled,
        avg_ticket_threshold: existing.avg_ticket_threshold,
        tenure_enabled: existing.tenure_enabled,
        tenure_days: existing.tenure_days,
        revenue_weight: existing.revenue_weight,
        retail_weight: existing.retail_weight,
        rebooking_weight: existing.rebooking_weight,
        avg_ticket_weight: existing.avg_ticket_weight,
        evaluation_window_days: existing.evaluation_window_days,
        requires_manual_approval: existing.requires_manual_approval,
      });
    } else if (open && !isLoading) {
      setForm(INITIAL_STATE);
    }
  }, [existing, open, isLoading]);

  // Hydrate retention form
  useEffect(() => {
    if (existingRetention) {
      setRetForm({
        retention_enabled: existingRetention.retention_enabled,
        revenue_enabled: existingRetention.revenue_enabled,
        revenue_minimum: Number(existingRetention.revenue_minimum),
        retail_enabled: existingRetention.retail_enabled,
        retail_pct_minimum: Number(existingRetention.retail_pct_minimum),
        rebooking_enabled: existingRetention.rebooking_enabled,
        rebooking_pct_minimum: Number(existingRetention.rebooking_pct_minimum),
        avg_ticket_enabled: existingRetention.avg_ticket_enabled,
        avg_ticket_minimum: Number(existingRetention.avg_ticket_minimum),
        evaluation_window_days: existingRetention.evaluation_window_days,
        grace_period_days: existingRetention.grace_period_days,
        action_type: existingRetention.action_type as 'coaching_flag' | 'demotion_eligible',
      });
    } else if (open && !loadingRetention) {
      setRetForm(INITIAL_RETENTION_STATE);
    }
  }, [existingRetention, open, loadingRetention]);

  // Reset step/tab on open — default to retention for Level 1 (no promotion applicable)
  useEffect(() => {
    if (open) {
      setStep(0);
      setActiveTab(levelIndex === totalLevels - 1 ? 'retention' : 'promotion');
    }
  }, [open, levelIndex]);

  const enabledCriteria = CRITERIA.filter(c => form[c.enabledKey] as boolean);
  const enabledCount = enabledCriteria.length + (form.tenure_enabled ? 1 : 0);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const setRetField = useCallback(<K extends keyof RetentionFormState>(key: K, value: RetentionFormState[K]) => {
    setRetForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Auto-distribute weights equally when toggling criteria
  const toggleCriterion = useCallback((enabledKey: keyof FormState) => {
    setForm(prev => {
      const next = { ...prev, [enabledKey]: !prev[enabledKey] };
      const active = CRITERIA.filter(c => next[c.enabledKey] as boolean);
      if (active.length === 0) {
        CRITERIA.forEach(c => { next[c.weightKey] = 0 as never; });
      } else {
        const base = Math.floor(100 / active.length);
        const remainder = 100 - base * active.length;
        active.forEach((c, i) => {
          next[c.weightKey] = (base + (i < remainder ? 1 : 0)) as never;
        });
        CRITERIA.filter(c => !(next[c.enabledKey] as boolean)).forEach(c => {
          next[c.weightKey] = 0 as never;
        });
      }
      return next;
    });
  }, []);

  const adjustWeight = useCallback((key: keyof FormState, newValue: number) => {
    setForm(prev => {
      const next = { ...prev };
      const active = CRITERIA.filter(c => next[c.enabledKey] as boolean);
      if (active.length <= 1) return prev;
      
      const currentCriterion = CRITERIA.find(c => c.weightKey === key);
      if (!currentCriterion) return prev;
      
      const otherActive = active.filter(c => c.weightKey !== key);
      const clampedValue = Math.max(0, Math.min(100, newValue));
      const remaining = 100 - clampedValue;
      
      next[key] = clampedValue as never;
      
      const otherBase = Math.floor(remaining / otherActive.length);
      const otherRemainder = remaining - otherBase * otherActive.length;
      otherActive.forEach((c, i) => {
        next[c.weightKey] = (otherBase + (i < otherRemainder ? 1 : 0)) as never;
      });
      
      return next;
    });
  }, []);

  const totalWeight = CRITERIA.reduce((sum, c) => sum + (form[c.weightKey] as number), 0);

  const handleSave = () => {
    if (!orgId) return;
    const payload: LevelPromotionCriteriaUpsert = {
      organization_id: orgId,
      stylist_level_id: levelId,
      ...form,
      is_active: true,
    };
    upsert.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleClear = () => {
    if (existing?.id) {
      deleteCriteria.mutate(existing.id, {
        onSuccess: () => {
          setForm(INITIAL_STATE);
          onOpenChange(false);
        },
      });
    } else {
      setForm(INITIAL_STATE);
    }
  };

  const handleSaveRetention = () => {
    if (!orgId) return;
    const payload: LevelRetentionCriteriaUpsert = {
      organization_id: orgId,
      stylist_level_id: levelId,
      ...retForm,
      is_active: true,
    };
    upsertRetention.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleClearRetention = () => {
    if (existingRetention?.id) {
      deleteRetention.mutate(existingRetention.id, {
        onSuccess: () => {
          setRetForm(INITIAL_RETENTION_STATE);
          onOpenChange(false);
        },
      });
    } else {
      setRetForm(INITIAL_RETENTION_STATE);
    }
  };

  const allThresholdsValid = CRITERIA.every(c => {
    if (!(form[c.enabledKey] as boolean)) return true;
    return (form[c.thresholdKey] as number) > 0;
  }) && (!form.tenure_enabled || form.tenure_days > 0);
  const canProceedFromStep0 = enabledCount > 0 && allThresholdsValid;
  const canProceedFromStep1 = totalWeight === 100 || enabledCriteria.length === 0;
  const canSave = canProceedFromStep0 && canProceedFromStep1;

  const steps = ['Requirements', 'Weights', 'Settings'];
  const showWeightsStep = enabledCriteria.length > 1;
  const activeSteps = showWeightsStep ? steps : [steps[0], steps[2]];

  const goNext = () => {
    if (!showWeightsStep && step === 0) setStep(2);
    else setStep(s => Math.min(s + 1, 2));
  };
  const goBack = () => {
    if (!showWeightsStep && step === 2) setStep(0);
    else setStep(s => Math.max(s - 1, 0));
  };

  const enabledRetentionCount = RETENTION_CRITERIA.filter(c => retForm[c.enabledKey] as boolean).length;
  const retentionMinValid = RETENTION_CRITERIA.every(c => {
    if (!(retForm[c.enabledKey] as boolean)) return true;
    return (retForm[c.minimumKey] as number) > 0;
  });
  const canSaveRetention = retForm.retention_enabled && enabledRetentionCount > 0 && retentionMinValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <DialogTitle className={cn(tokens.heading.card, 'text-sm')}>
                Level Criteria
              </DialogTitle>
            </div>
            <DialogDescription className={tokens.body.muted}>
              Define criteria for <span className="font-medium text-foreground">{levelLabel}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setStep(0); }} className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="promotion" className="flex-1 text-xs gap-1.5" disabled={levelIndex === totalLevels - 1}>
                <Sparkles className="w-3.5 h-3.5" />
                Required to Graduate
              </TabsTrigger>
              <TabsTrigger value="retention" className="flex-1 text-xs gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Required to Stay
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Step indicators — only for promotion tab */}
          {activeTab === 'promotion' && (
            <div className="flex items-center gap-2 mt-4">
              {activeSteps.map((s, i) => {
                const actualStep = showWeightsStep ? i : (i === 0 ? 0 : 2);
                const isActive = step === actualStep;
                const isDone = step > actualStep;
                return (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <div className={cn("w-8 h-px", isDone || isActive ? "bg-primary" : "bg-border")} />}
                    <button
                      onClick={() => setStep(actualStep)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
                        isActive && "bg-primary/10 text-primary",
                        isDone && "text-primary",
                        !isActive && !isDone && "text-muted-foreground"
                      )}
                    >
                      {isDone ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {i + 1}
                        </span>
                      )}
                      <span className="font-sans">{s}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[280px] max-h-[50vh] overflow-y-auto">
          {(isLoading || loadingRetention) ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : activeTab === 'promotion' ? (
            <>
              {/* Step 0: Select Requirements */}
              {step === 0 && (
                <div className="space-y-3">
                  {/* Zura Defaults banner */}
                  {!existing && enabledCount === 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium font-sans">Start with Zura's recommended criteria</p>
                        <p className="text-xs text-muted-foreground font-sans">Industry benchmarks tuned for this level — tweak as needed.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-full h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10 font-sans"
                        onClick={() => setForm(getZuraDefaults(levelIndex))}
                      >
                        Apply Defaults
                      </Button>
                    </div>
                  )}

                  <p className={cn(tokens.body.muted, 'mb-4')}>
                    Toggle on the metrics that matter for promotion to this level.
                  </p>

                  {CRITERIA.map(criterion => {
                    const Icon = criterion.icon;
                    const enabled = form[criterion.enabledKey] as boolean;
                    const threshold = form[criterion.thresholdKey] as number;
                    return (
                      <div
                        key={criterion.key}
                        className={cn(
                          "rounded-lg border p-3 transition-all",
                          enabled ? "border-primary/30 bg-primary/5" : "border-border bg-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              enabled ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <span className={cn("text-sm", enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
                              {criterion.label}
                            </span>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleCriterion(criterion.enabledKey)}
                          />
                        </div>
                        {enabled && (
                          <div className="mt-3 pl-11">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Min:</span>
                              <div className="relative flex-1 max-w-[160px]">
                                {(criterion.unit === '$' || criterion.unit === '/mo') && (
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                )}
                                <Input
                                  type="number"
                                  value={threshold || ''}
                                  onChange={(e) => setField(criterion.thresholdKey, Number(e.target.value))}
                                  placeholder={criterion.placeholder}
                                  className={cn("h-8 text-sm", (criterion.unit === '$' || criterion.unit === '/mo') && "pl-6")}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{criterion.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Tenure */}
                  <div className={cn(
                    "rounded-lg border p-3 transition-all",
                    form.tenure_enabled ? "border-primary/30 bg-primary/5" : "border-border bg-transparent"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          form.tenure_enabled ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Clock className={cn("w-4 h-4", form.tenure_enabled ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <span className={cn("text-sm", form.tenure_enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
                            Minimum Tenure
                          </span>
                          <p className="text-[10px] text-muted-foreground">Time at current level before eligible</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.tenure_enabled}
                        onCheckedChange={() => setField('tenure_enabled', !form.tenure_enabled)}
                      />
                    </div>
                    {form.tenure_enabled && (
                      <div className="mt-3 pl-11">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Min:</span>
                          <Input
                            type="number"
                            value={form.tenure_days || ''}
                            onChange={(e) => setField('tenure_days', Number(e.target.value))}
                            placeholder="90"
                            className="h-8 text-sm max-w-[100px]"
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Weights */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className={cn(tokens.body.muted, 'mb-4')}>
                    Set the relative importance of each metric. Weights must total 100%.
                  </p>

                  {enabledCriteria.map(criterion => {
                    const weight = form[criterion.weightKey] as number;
                    const Icon = criterion.icon;
                    return (
                      <div key={criterion.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{criterion.label}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs font-sans tabular-nums">
                            {weight}%
                          </Badge>
                        </div>
                        <Slider
                          value={[weight]}
                          onValueChange={([v]) => adjustWeight(criterion.weightKey, v)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    );
                  })}

                  <div className={cn(
                    "flex items-center justify-between pt-3 border-t",
                    totalWeight !== 100 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <span className="text-xs">Total</span>
                    <span className="text-sm font-medium tabular-nums">{totalWeight}%</span>
                  </div>
                </div>
              )}

              {/* Step 2: Settings */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Evaluation Window</p>
                      <p className="text-xs text-muted-foreground">Rolling period used to measure performance</p>
                    </div>
                    <div className="flex gap-2">
                      {EVAL_WINDOWS.map(days => (
                        <button
                          key={days}
                          onClick={() => setField('evaluation_window_days', days)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm transition-colors border",
                            form.evaluation_window_days === days
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {days} days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Require Manager Approval</p>
                        <p className="text-[10px] text-muted-foreground">Promotion needs sign-off even when criteria are met</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.requires_manual_approval}
                      onCheckedChange={(v) => setField('requires_manual_approval', v)}
                    />
                  </div>

                  {enabledCount > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Summary</p>
                      <p className="text-sm">
                        To become <span className="font-medium">{levelLabel}</span>, a stylist must maintain:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {form.revenue_enabled && form.revenue_threshold > 0 && (
                          <li>• ${form.revenue_threshold.toLocaleString()} monthly revenue ({form.revenue_weight}% weight)</li>
                        )}
                        {form.retail_enabled && form.retail_pct_threshold > 0 && (
                          <li>• {form.retail_pct_threshold}% retail attachment ({form.retail_weight}% weight)</li>
                        )}
                        {form.rebooking_enabled && form.rebooking_pct_threshold > 0 && (
                          <li>• {form.rebooking_pct_threshold}% rebooking rate ({form.rebooking_weight}% weight)</li>
                        )}
                        {form.avg_ticket_enabled && form.avg_ticket_threshold > 0 && (
                          <li>• ${form.avg_ticket_threshold} avg ticket ({form.avg_ticket_weight}% weight)</li>
                        )}
                        {form.tenure_enabled && form.tenure_days > 0 && (
                          <li>• {form.tenure_days} days at current level</li>
                        )}
                      </ul>
                      <p className="text-xs text-muted-foreground">
                        Evaluated over a rolling {form.evaluation_window_days}-day window
                        {form.requires_manual_approval && ' • Requires manager approval'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ─── Retention Tab Content ─── */
            <div className="space-y-4">
              {/* Zura Defaults banner for retention */}
              {!existingRetention && !retForm.retention_enabled && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium font-sans">Apply Zura retention defaults</p>
                    <p className="text-xs text-muted-foreground font-sans">Minimum standards to maintain this level.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-full h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10 font-sans"
                    onClick={() => setRetForm(getZuraRetentionDefaults(levelIndex))}
                  >
                    Apply Defaults
                  </Button>
                </div>
              )}

              {/* Master toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Enable Retention Criteria</p>
                    <p className="text-[10px] text-muted-foreground">Flag stylists who fall below minimums for this level</p>
                  </div>
                </div>
                <Switch
                  checked={retForm.retention_enabled}
                  onCheckedChange={(v) => setRetField('retention_enabled', v)}
                />
              </div>

              {retForm.retention_enabled && (
                <>
                  <p className={cn(tokens.body.muted, 'text-xs')}>
                    Set minimums a stylist must maintain. Failing any enabled metric triggers a flag.
                  </p>

                  {/* Metric toggles */}
                  {RETENTION_CRITERIA.map(criterion => {
                    const Icon = criterion.icon;
                    const enabled = retForm[criterion.enabledKey] as boolean;
                    const minimum = retForm[criterion.minimumKey] as number;
                    return (
                      <div
                        key={criterion.key}
                        className={cn(
                          "rounded-lg border p-3 transition-all",
                          enabled ? "border-rose-300/50 bg-rose-50/50 dark:border-rose-800/40 dark:bg-rose-950/10" : "border-border bg-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              enabled ? "bg-rose-100 dark:bg-rose-950/30" : "bg-muted"
                            )}>
                              <Icon className={cn("w-4 h-4", enabled ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")} />
                            </div>
                            <span className={cn("text-sm", enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
                              {criterion.label}
                            </span>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => setRetField(criterion.enabledKey, !enabled as never)}
                          />
                        </div>
                        {enabled && (
                          <div className="mt-3 pl-11">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Min:</span>
                              <div className="relative flex-1 max-w-[160px]">
                                {(criterion.unit === '$' || criterion.unit === '/mo') && (
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                )}
                                <Input
                                  type="number"
                                  value={minimum || ''}
                                  onChange={(e) => setRetField(criterion.minimumKey, Number(e.target.value) as never)}
                                  placeholder={criterion.placeholder}
                                  className={cn("h-8 text-sm", (criterion.unit === '$' || criterion.unit === '/mo') && "pl-6")}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{criterion.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Settings */}
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div>
                      <p className="text-sm font-medium">Evaluation Window</p>
                      <div className="flex gap-2 mt-2">
                        {EVAL_WINDOWS.map(days => (
                          <button
                            key={days}
                            onClick={() => setRetField('evaluation_window_days', days)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm transition-colors border",
                              retForm.evaluation_window_days === days
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {days} days
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Grace Period</p>
                      <p className="text-[10px] text-muted-foreground mb-2">How long below threshold before flagged for action</p>
                      <div className="flex gap-2">
                        {GRACE_PERIODS.map(days => (
                          <button
                            key={days}
                            onClick={() => setRetField('grace_period_days', days)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm transition-colors border",
                              retForm.grace_period_days === days
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Action When Below Standard</p>
                      <Select value={retForm.action_type} onValueChange={(v) => setRetField('action_type', v as any)}>
                        <SelectTrigger className="mt-2 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coaching_flag">Coaching Flag — surface for 1:1 review</SelectItem>
                          <SelectItem value="demotion_eligible">Demotion Eligible — flag for potential level change</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/30">
          {activeTab === 'promotion' ? (
            <>
              <div>
                {existing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleClear}
                    disabled={deleteCriteria.isPending}
                  >
                    {deleteCriteria.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Clear Criteria
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={goBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                {((showWeightsStep && step < 2) || (!showWeightsStep && step === 0)) ? (
                  <Button
                    size="sm"
                    onClick={goNext}
                    disabled={step === 0 && !canProceedFromStep0}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!canSave || upsert.isPending}
                  >
                    {upsert.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Save Criteria
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                {existingRetention && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleClearRetention}
                    disabled={deleteRetention.isPending}
                  >
                    {deleteRetention.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Clear Retention
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSaveRetention}
                disabled={!canSaveRetention || upsertRetention.isPending}
              >
                {upsertRetention.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Save Retention
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
