import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import {
  useLevelPromotionCriteriaForLevel,
  useUpsertLevelPromotionCriteria,
  useDeleteLevelPromotionCriteria,
  type LevelPromotionCriteriaUpsert,
} from '@/hooks/useLevelPromotionCriteria';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface GraduationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelId: string;
  levelLabel: string;
  levelIndex: number;
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

const CRITERIA: CriterionConfig[] = [
  { key: 'revenue', label: 'Service Revenue', icon: DollarSign, unit: '/mo', enabledKey: 'revenue_enabled', thresholdKey: 'revenue_threshold', weightKey: 'revenue_weight', placeholder: '8000' },
  { key: 'retail', label: 'Retail Attachment', icon: ShoppingBag, unit: '%', enabledKey: 'retail_enabled', thresholdKey: 'retail_pct_threshold', weightKey: 'retail_weight', placeholder: '15' },
  { key: 'rebooking', label: 'Rebooking Rate', icon: CalendarCheck, unit: '%', enabledKey: 'rebooking_enabled', thresholdKey: 'rebooking_pct_threshold', weightKey: 'rebooking_weight', placeholder: '70' },
  { key: 'avg_ticket', label: 'Average Ticket', icon: Receipt, unit: '$', enabledKey: 'avg_ticket_enabled', thresholdKey: 'avg_ticket_threshold', weightKey: 'avg_ticket_weight', placeholder: '120' },
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

const EVAL_WINDOWS = [30, 60, 90];

function getZuraDefaults(levelIndex: number): FormState {
  if (levelIndex <= 1) {
    // Level 2 / Emerging
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
    // Level 3 / Lead
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
    // Level 4 / Senior
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
  // Level 5+ / Signature / Icon
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

export function GraduationWizard({ open, onOpenChange, levelId, levelLabel, levelIndex }: GraduationWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: existing, isLoading } = useLevelPromotionCriteriaForLevel(open ? levelId : undefined);
  const upsert = useUpsertLevelPromotionCriteria();
  const deleteCriteria = useDeleteLevelPromotionCriteria();

  // Hydrate form from existing data
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

  // Reset step on open
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const enabledCriteria = CRITERIA.filter(c => form[c.enabledKey] as boolean);
  const enabledCount = enabledCriteria.length + (form.tenure_enabled ? 1 : 0);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Auto-distribute weights equally when toggling criteria
  const toggleCriterion = useCallback((enabledKey: keyof FormState) => {
    setForm(prev => {
      const next = { ...prev, [enabledKey]: !prev[enabledKey] };
      // Recalculate weights for performance criteria only (not tenure)
      const active = CRITERIA.filter(c => next[c.enabledKey] as boolean);
      if (active.length === 0) {
        CRITERIA.forEach(c => { next[c.weightKey] = 0 as never; });
      } else {
        const base = Math.floor(100 / active.length);
        const remainder = 100 - base * active.length;
        active.forEach((c, i) => {
          next[c.weightKey] = (base + (i < remainder ? 1 : 0)) as never;
        });
        // Zero out disabled criteria weights
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
      
      // Distribute remaining among other active criteria
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

  // Require at least 1 criterion enabled AND all enabled criteria must have non-zero thresholds
  const allThresholdsValid = CRITERIA.every(c => {
    if (!(form[c.enabledKey] as boolean)) return true;
    return (form[c.thresholdKey] as number) > 0;
  }) && (!form.tenure_enabled || form.tenure_days > 0);
  const canProceedFromStep0 = enabledCount > 0 && allThresholdsValid;
  const canProceedFromStep1 = totalWeight === 100 || enabledCriteria.length === 0;
  const canSave = canProceedFromStep0 && canProceedFromStep1;

  const steps = ['Requirements', 'Weights', 'Settings'];
  // Skip weights step if only 1 criterion or none
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <DialogTitle className={cn(tokens.heading.card, 'text-sm')}>
                Graduation Pathway
              </DialogTitle>
            </div>
            <DialogDescription className={tokens.body.muted}>
              Define what a stylist must achieve to become <span className="font-medium text-foreground">{levelLabel}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
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
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[280px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : (
            <>
              {/* Step 0: Select Requirements */}
              {step === 0 && (
                <div className="space-y-3">
                  {/* Zura Defaults banner — show when no criteria are configured */}
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

                  {/* Tenure - separate since it's not weighted */}
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
                  {/* Evaluation Window */}
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

                  {/* Manual Approval */}
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

                  {/* Summary */}
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/30">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
