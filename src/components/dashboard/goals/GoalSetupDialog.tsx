import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import {
  GOAL_TEMPLATES,
  GOAL_CATEGORY_LABELS,
  useUpsertOrganizationGoal,
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

export function GoalSetupDialog({
  open,
  onOpenChange,
  editGoal,
  defaultCategory = 'revenue',
  existingMetricKeys = [],
}: GoalSetupDialogProps) {
  const upsert = useUpsertOrganizationGoal();
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>(defaultCategory);
  const [targetValue, setTargetValue] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [criticalThreshold, setCriticalThreshold] = useState('');
  const [unit, setUnit] = useState<'$' | '%' | 'count'>('$');
  const [goalPeriod, setGoalPeriod] = useState('monthly');

  const isEditing = !!editGoal;

  // Available templates (exclude already-added ones, unless editing that one)
  const availableTemplates = useMemo(() => {
    return GOAL_TEMPLATES.filter(t =>
      t.category === category &&
      (!existingMetricKeys.includes(t.metric_key) || editGoal?.metric_key === t.metric_key)
    );
  }, [category, existingMetricKeys, editGoal]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editGoal) {
        setSelectedTemplate(editGoal.metric_key);
        setDisplayName(editGoal.display_name);
        setDescription(editGoal.description || '');
        setCategory(editGoal.category as GoalCategory);
        setTargetValue(String(editGoal.target_value));
        setWarningThreshold(editGoal.warning_threshold ? String(editGoal.warning_threshold) : '');
        setCriticalThreshold(editGoal.critical_threshold ? String(editGoal.critical_threshold) : '');
        setUnit(editGoal.unit as '$' | '%' | 'count');
        setGoalPeriod(editGoal.goal_period);
      } else {
        setSelectedTemplate('');
        setDisplayName('');
        setDescription('');
        setCategory(defaultCategory);
        setTargetValue('');
        setWarningThreshold('');
        setCriticalThreshold('');
        setUnit('$');
        setGoalPeriod('monthly');
      }
    }
  }, [open, editGoal, defaultCategory]);

  const handleTemplateSelect = (key: string) => {
    setSelectedTemplate(key);
    const tmpl = GOAL_TEMPLATES.find(t => t.metric_key === key);
    if (tmpl) {
      setDisplayName(tmpl.display_name);
      setDescription(tmpl.description);
      setUnit(tmpl.unit);
      setGoalPeriod(tmpl.goal_period);
      if (tmpl.suggested_target !== null) setTargetValue(String(tmpl.suggested_target));
      if (tmpl.suggested_warning !== null) setWarningThreshold(String(tmpl.suggested_warning));
      if (tmpl.suggested_critical !== null) setCriticalThreshold(String(tmpl.suggested_critical));
    }
  };

  const handleSave = () => {
    if (!displayName || !targetValue) return;
    upsert.mutate({
      metric_key: selectedTemplate || displayName.toLowerCase().replace(/\s+/g, '_'),
      display_name: displayName,
      description,
      category,
      target_value: parseFloat(targetValue),
      warning_threshold: warningThreshold ? parseFloat(warningThreshold) : undefined,
      critical_threshold: criticalThreshold ? parseFloat(criticalThreshold) : undefined,
      goal_period: goalPeriod,
      unit,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={tokens.heading.card}>
            {isEditing ? 'Edit Goal' : 'Add Goal'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category selector (hidden when editing) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v as GoalCategory); setSelectedTemplate(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GOAL_CATEGORY_LABELS) as GoalCategory[]).map(cat => (
                    <SelectItem key={cat} value={cat}>{GOAL_CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template picker */}
          {!isEditing && availableTemplates.length > 0 && (
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Goal Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a goal..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(t => (
                    <SelectItem key={t.metric_key} value={t.metric_key}>{t.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className={tokens.label.default}>Goal Name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Monthly Revenue" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as '$' | '%' | 'count')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$">Dollar ($)</SelectItem>
                  <SelectItem value="%">Percent (%)</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Period</Label>
              <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={tokens.label.default}>Target Value</Label>
            <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="e.g. 50000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Warning Threshold</Label>
              <Input type="number" value={warningThreshold} onChange={e => setWarningThreshold(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Critical Threshold</Label>
              <Input type="number" value={criticalThreshold} onChange={e => setCriticalThreshold(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!displayName || !targetValue || upsert.isPending}>
            {upsert.isPending ? 'Saving...' : isEditing ? 'Update Goal' : 'Add Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
