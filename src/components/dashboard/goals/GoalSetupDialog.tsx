import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, ChevronDown, ArrowLeft, Sparkles } from 'lucide-react';
import {
  GOAL_TEMPLATES,
  GOAL_CATEGORY_LABELS,
  useUpsertOrganizationGoal,
  useBatchUpsertOrganizationGoals,
  type OrganizationGoal,
  type GoalCategory,
  type GoalTemplate,
} from '@/hooks/useOrganizationGoals';

interface GoalSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGoal?: OrganizationGoal | null;
  defaultCategory?: GoalCategory;
  existingMetricKeys?: string[];
}

// Group templates by category
function groupByCategory(templates: GoalTemplate[]): Record<GoalCategory, GoalTemplate[]> {
  const groups: Record<string, GoalTemplate[]> = {};
  for (const t of templates) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups as Record<GoalCategory, GoalTemplate[]>;
}

const CATEGORY_ORDER: GoalCategory[] = ['revenue', 'profitability', 'client', 'efficiency', 'team'];

const RECOMMENDED_KEYS = ['monthly_revenue', 'labor_cost_pct', 'client_retention', 'utilization_rate', 'revenue_per_stylist'];

function formatTarget(template: GoalTemplate): string {
  if (template.suggested_target === null) return '—';
  if (template.unit === '$') return `$${template.suggested_target.toLocaleString()}`;
  if (template.unit === '%') return `${template.suggested_target}%`;
  return String(template.suggested_target);
}

interface SelectedGoalState {
  metric_key: string;
  target_value: string;
  warning_threshold: string;
  critical_threshold: string;
}

export function GoalSetupDialog({
  open,
  onOpenChange,
  editGoal,
  defaultCategory = 'revenue',
  existingMetricKeys = [],
}: GoalSetupDialogProps) {
  const upsertSingle = useUpsertOrganizationGoal();
  const batchUpsert = useBatchUpsertOrganizationGoals();

  const [step, setStep] = useState<'select' | 'customize'>('select');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [goalStates, setGoalStates] = useState<Map<string, SelectedGoalState>>(new Map());
  const [expandedAdvanced, setExpandedAdvanced] = useState<Set<string>>(new Set());

  const isEditing = !!editGoal;
  const grouped = useMemo(() => groupByCategory(GOAL_TEMPLATES), []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editGoal) {
        setStep('customize');
        setSelectedKeys(new Set([editGoal.metric_key]));
        setGoalStates(new Map([[editGoal.metric_key, {
          metric_key: editGoal.metric_key,
          target_value: String(editGoal.target_value),
          warning_threshold: editGoal.warning_threshold ? String(editGoal.warning_threshold) : '',
          critical_threshold: editGoal.critical_threshold ? String(editGoal.critical_threshold) : '',
        }]]));
      } else {
        setStep('select');
        setSelectedKeys(new Set());
        setGoalStates(new Map());
        setExpandedAdvanced(new Set());
      }
    }
  }, [open, editGoal]);

  const toggleTemplate = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      // Initialize state from template defaults
      const tmpl = GOAL_TEMPLATES.find(t => t.metric_key === key);
      if (tmpl && !goalStates.has(key)) {
        setGoalStates(prev => new Map(prev).set(key, {
          metric_key: key,
          target_value: tmpl.suggested_target !== null ? String(tmpl.suggested_target) : '',
          warning_threshold: tmpl.suggested_warning !== null ? String(tmpl.suggested_warning) : '',
          critical_threshold: tmpl.suggested_critical !== null ? String(tmpl.suggested_critical) : '',
        }));
      }
    }
    setSelectedKeys(next);
  };

  const updateGoalState = (key: string, field: keyof SelectedGoalState, value: string) => {
    setGoalStates(prev => {
      const next = new Map(prev);
      const current = next.get(key);
      if (current) {
        next.set(key, { ...current, [field]: value });
      }
      return next;
    });
  };

  const handleNext = () => {
    if (selectedKeys.size === 0) return;
    setStep('customize');
  };

  const handleSave = () => {
    const selectedTemplates = GOAL_TEMPLATES.filter(t => selectedKeys.has(t.metric_key));

    if (isEditing && editGoal) {
      const state = goalStates.get(editGoal.metric_key);
      if (!state || !state.target_value) return;
      const tmpl = GOAL_TEMPLATES.find(t => t.metric_key === editGoal.metric_key);
      upsertSingle.mutate({
        metric_key: editGoal.metric_key,
        display_name: tmpl?.display_name || editGoal.display_name,
        description: tmpl?.description || editGoal.description || '',
        category: editGoal.category,
        target_value: parseFloat(state.target_value),
        warning_threshold: state.warning_threshold ? parseFloat(state.warning_threshold) : undefined,
        critical_threshold: state.critical_threshold ? parseFloat(state.critical_threshold) : undefined,
        goal_period: tmpl?.goal_period || editGoal.goal_period,
        unit: tmpl?.unit || editGoal.unit,
      }, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }

    const goals = selectedTemplates.map(tmpl => {
      const state = goalStates.get(tmpl.metric_key);
      return {
        metric_key: tmpl.metric_key,
        display_name: tmpl.display_name,
        description: tmpl.description,
        category: tmpl.category,
        target_value: parseFloat(state?.target_value || String(tmpl.suggested_target || 0)),
        warning_threshold: state?.warning_threshold ? parseFloat(state.warning_threshold) : undefined,
        critical_threshold: state?.critical_threshold ? parseFloat(state.critical_threshold) : undefined,
        goal_period: tmpl.goal_period,
        unit: tmpl.unit,
      };
    });

    batchUpsert.mutate(goals, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const isPending = upsertSingle.isPending || batchUpsert.isPending;
  const selectedTemplates = GOAL_TEMPLATES.filter(t => selectedKeys.has(t.metric_key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className={tokens.heading.card}>
            {isEditing ? 'Edit Goal' : step === 'select' ? 'Choose Your Goals' : 'Set Your Targets'}
          </DialogTitle>
          <DialogDescription className={tokens.body.muted}>
            {isEditing
              ? 'Update the target for this goal.'
              : step === 'select'
                ? 'Tap to select the goals that matter most to your salon.'
                : 'Review and customize your targets. Industry benchmarks are pre-filled.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          /* ─── STEP 1: TEMPLATE PICKER ─── */
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 pb-4 space-y-5">
              {/* Quick Setup Banner */}
              {(() => {
                const availableRecommended = RECOMMENDED_KEYS.filter(k => !existingMetricKeys.includes(k));
                if (availableRecommended.length === 0) return null;
                const allSelected = availableRecommended.every(k => selectedKeys.has(k));
                return (
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedKeys);
                      const newStates = new Map(goalStates);
                      availableRecommended.forEach(key => {
                        if (allSelected) {
                          next.delete(key);
                        } else {
                          next.add(key);
                          if (!newStates.has(key)) {
                            const tmpl = GOAL_TEMPLATES.find(t => t.metric_key === key);
                            if (tmpl) {
                              newStates.set(key, {
                                metric_key: key,
                                target_value: tmpl.suggested_target !== null ? String(tmpl.suggested_target) : '',
                                warning_threshold: tmpl.suggested_warning !== null ? String(tmpl.suggested_warning) : '',
                                critical_threshold: tmpl.suggested_critical !== null ? String(tmpl.suggested_critical) : '',
                              });
                            }
                          }
                        }
                      });
                      setSelectedKeys(next);
                      setGoalStates(newStates);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border-2 p-4 transition-all text-left',
                      allSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-dashed border-primary/40 bg-primary/[0.02] hover:border-primary/60',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-sans text-sm font-medium text-foreground block">
                        Quick Setup — Recommended Goals
                      </span>
                      <span className="font-sans text-xs text-muted-foreground">
                        Select the {availableRecommended.length} most impactful goals for your salon with one tap.
                      </span>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                      allSelected ? 'bg-primary text-primary-foreground' : 'border border-border/60',
                    )}>
                      {allSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })()}
              {CATEGORY_ORDER.map(cat => {
                const templates = grouped[cat];
                if (!templates?.length) return null;
                return (
                  <div key={cat}>
                    <h3 className={cn(tokens.heading.subsection, 'mb-3')}>
                      {GOAL_CATEGORY_LABELS[cat]}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {templates.map(tmpl => {
                        const isExisting = existingMetricKeys.includes(tmpl.metric_key);
                        const isSelected = selectedKeys.has(tmpl.metric_key);
                        return (
                          <button
                            key={tmpl.metric_key}
                            type="button"
                            disabled={isExisting}
                            onClick={() => toggleTemplate(tmpl.metric_key)}
                            className={cn(
                              'relative text-left rounded-xl border-2 p-3.5 transition-all duration-200',
                              'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isExisting
                                ? 'border-border/40 bg-muted/30 opacity-60 cursor-not-allowed'
                                : isSelected
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border/40 bg-card hover:border-border',
                            )}
                          >
                            {/* Check indicator */}
                            <div className={cn(
                              'absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all',
                              isExisting
                                ? 'bg-muted text-muted-foreground'
                                : isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border border-border/60',
                            )}>
                              {(isExisting || isSelected) && <Check className="w-3 h-3" />}
                            </div>

                            <span className="font-sans text-sm font-medium text-foreground block pr-6">
                              {tmpl.display_name}
                            </span>
                            <span className="font-display text-base font-medium tracking-wide text-primary mt-1 block">
                              {formatTarget(tmpl)}
                              <span className="text-xs text-muted-foreground font-sans font-normal ml-1">
                                /{tmpl.goal_period === 'weekly' ? 'wk' : 'mo'}
                              </span>
                            </span>
                            <span className="font-sans text-xs text-muted-foreground mt-1.5 block line-clamp-2">
                              {tmpl.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          /* ─── STEP 2: CUSTOMIZE TARGETS ─── */
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 pb-4 space-y-3">
              {selectedTemplates.map(tmpl => {
                const state = goalStates.get(tmpl.metric_key);
                if (!state) return null;
                const isAdvancedOpen = expandedAdvanced.has(tmpl.metric_key);
                return (
                  <div
                    key={tmpl.metric_key}
                    className="rounded-xl border border-border/60 bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="font-sans text-sm font-medium text-foreground">
                          {tmpl.display_name}
                        </span>
                        <p className="font-sans text-xs text-muted-foreground mt-0.5">
                          {tmpl.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tmpl.unit === '$' && (
                          <span className="font-sans text-sm text-muted-foreground">$</span>
                        )}
                        <Input
                          type="number"
                          value={state.target_value}
                          onChange={e => updateGoalState(tmpl.metric_key, 'target_value', e.target.value)}
                          className="w-24 h-9 text-right rounded-lg"
                          autoCapitalize="off"
                        />
                        {tmpl.unit === '%' && (
                          <span className="font-sans text-sm text-muted-foreground">%</span>
                        )}
                      </div>
                    </div>

                    {/* Advanced thresholds */}
                    <Collapsible
                      open={isAdvancedOpen}
                      onOpenChange={(o) => {
                        const next = new Set(expandedAdvanced);
                        o ? next.add(tmpl.metric_key) : next.delete(tmpl.metric_key);
                        setExpandedAdvanced(next);
                      }}
                    >
                      <CollapsibleTrigger className="flex items-center gap-1 mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {isAdvancedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Warning & Critical Thresholds
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-3 mt-2.5">
                          <div className="space-y-1">
                            <Label className="font-sans text-xs text-muted-foreground">Warning</Label>
                            <Input
                              type="number"
                              value={state.warning_threshold}
                              onChange={e => updateGoalState(tmpl.metric_key, 'warning_threshold', e.target.value)}
                              className="h-8 text-sm rounded-lg"
                              placeholder="Optional"
                              autoCapitalize="off"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="font-sans text-xs text-muted-foreground">Critical</Label>
                            <Input
                              type="number"
                              value={state.critical_threshold}
                              onChange={e => updateGoalState(tmpl.metric_key, 'critical_threshold', e.target.value)}
                              className="h-8 text-sm rounded-lg"
                              placeholder="Optional"
                              autoCapitalize="off"
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/40">
          {step === 'select' ? (
            <div className="flex items-center justify-between w-full">
              <span className="font-sans text-sm text-muted-foreground">
                {selectedKeys.size} selected
              </span>
              <Button onClick={handleNext} disabled={selectedKeys.size === 0}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {!isEditing && (
                <Button variant="ghost" onClick={() => setStep('select')}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <div className={cn(!isEditing ? '' : 'ml-auto')}>
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending
                    ? 'Saving...'
                    : isEditing
                      ? 'Update Goal'
                      : `Save ${selectedKeys.size} Goal${selectedKeys.size === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
