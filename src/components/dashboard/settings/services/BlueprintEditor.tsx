/**
 * BlueprintEditor — Owner settings UI for defining service blueprint steps.
 *
 * Drag-to-reorder steps, add/edit/delete steps with type-specific metadata forms.
 * Placed inside service detail settings (Services & Schedule).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Beaker,
  HandHelping,
  Paintbrush,
  Timer,
  Droplets,
  CheckCircle2,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import {
  BLUEPRINT_STEP_TYPES,
  STEP_TYPE_LABELS,
  getDefaultMetadata,
  type BlueprintStepType,
  type BlueprintStep,
  type MixStepMetadata,
  type AssistantPrepStepMetadata,
  type ProcessingStepMetadata,
} from '@/lib/backroom/blueprint-engine';
import {
  useServiceBlueprint,
  useUpsertBlueprintStep,
  useDeleteBlueprintStep,
  useReorderBlueprintSteps,
} from '@/hooks/backroom/useServiceBlueprints';

const STEP_ICONS: Record<BlueprintStepType, React.ReactNode> = {
  mix_step: <Beaker className="w-4 h-4" />,
  assistant_prep_step: <HandHelping className="w-4 h-4" />,
  application_step: <Paintbrush className="w-4 h-4" />,
  processing_step: <Timer className="w-4 h-4" />,
  rinse_step: <Droplets className="w-4 h-4" />,
  finish_step: <CheckCircle2 className="w-4 h-4" />,
};

interface BlueprintEditorProps {
  serviceId: string;
}

export function BlueprintEditor({ serviceId }: BlueprintEditorProps) {
  const { data: steps = [], isLoading } = useServiceBlueprint(serviceId);
  const upsertStep = useUpsertBlueprintStep();
  const deleteStep = useDeleteBlueprintStep();
  const reorderSteps = useReorderBlueprintSteps();

  const [editingStep, setEditingStep] = useState<Partial<BlueprintStep> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddStep = () => {
    setEditingStep({
      service_id: serviceId,
      position: steps.length,
      step_type: 'application_step',
      title: '',
      description: null,
      metadata: getDefaultMetadata('application_step'),
    });
    setIsDialogOpen(true);
  };

  const handleEditStep = (step: BlueprintStep) => {
    setEditingStep({ ...step });
    setIsDialogOpen(true);
  };

  const handleDeleteStep = (step: BlueprintStep) => {
    deleteStep.mutate({ id: step.id, service_id: serviceId });
  };

  const handleSaveStep = () => {
    if (!editingStep?.title || !editingStep.step_type) return;

    upsertStep.mutate(
      {
        id: editingStep.id,
        service_id: serviceId,
        position: editingStep.position ?? steps.length,
        step_type: editingStep.step_type as BlueprintStepType,
        title: editingStep.title,
        description: editingStep.description,
        metadata: editingStep.metadata,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingStep(null);
        },
      },
    );
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    )
      return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = steps.map((s, i) => ({
      id: s.id,
      position: i === index ? steps[swapIndex].position : i === swapIndex ? steps[index].position : s.position,
    }));

    reorderSteps.mutate({ service_id: serviceId, steps: newSteps });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <Card className="rounded-xl bg-card/80 backdrop-blur-xl border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Service Blueprint</CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground">
              Define the workflow steps for this service
            </CardDescription>
          </div>
        </div>
        <Button size="sm" className={tokens.button.cardAction} onClick={handleAddStep}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Step
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {steps.length === 0 ? (
          <div className={tokens.empty.container}>
            <ClipboardList className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No Blueprint Steps</h3>
            <p className={tokens.empty.description}>
              Add steps to define the workflow for this service
            </p>
          </div>
        ) : (
          steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => handleMoveStep(index, 'up')}
                >
                  <GripVertical className="w-3.5 h-3.5 rotate-180" />
                </button>
                <button
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === steps.length - 1}
                  onClick={() => handleMoveStep(index, 'down')}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-primary">
                {STEP_ICONS[step.step_type as BlueprintStepType]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-sans text-sm text-foreground truncate">{step.title}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {STEP_TYPE_LABELS[step.step_type as BlueprintStepType]}
                  </Badge>
                </div>
                {step.description && (
                  <p className="font-sans text-xs text-muted-foreground truncate mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditStep(step)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDeleteStep(step)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Step Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base tracking-wide">
              {editingStep?.id ? 'Edit Step' : 'Add Step'}
            </DialogTitle>
          </DialogHeader>

          {editingStep && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-sans text-sm font-medium">Step Type</Label>
                <Select
                  value={editingStep.step_type}
                  onValueChange={(v) =>
                    setEditingStep({
                      ...editingStep,
                      step_type: v as BlueprintStepType,
                      metadata: getDefaultMetadata(v as BlueprintStepType),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLUEPRINT_STEP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {STEP_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-sans text-sm font-medium">Title</Label>
                <Input
                  value={editingStep.title ?? ''}
                  onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                  placeholder="e.g. Mix Root Formula"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-sans text-sm font-medium">Description</Label>
                <Textarea
                  value={editingStep.description ?? ''}
                  onChange={(e) => setEditingStep({ ...editingStep, description: e.target.value })}
                  placeholder="Optional instructions or notes"
                  rows={2}
                />
              </div>

              {/* Type-specific metadata fields */}
              {editingStep.step_type === 'mix_step' && (
                <MixStepFields
                  metadata={(editingStep.metadata ?? {}) as MixStepMetadata}
                  onChange={(m) => setEditingStep({ ...editingStep, metadata: m })}
                />
              )}

              {editingStep.step_type === 'assistant_prep_step' && (
                <AssistantPrepFields
                  metadata={(editingStep.metadata ?? { tasks: [] }) as AssistantPrepStepMetadata}
                  onChange={(m) => setEditingStep({ ...editingStep, metadata: m })}
                />
              )}

              {editingStep.step_type === 'processing_step' && (
                <ProcessingFields
                  metadata={(editingStep.metadata ?? {}) as ProcessingStepMetadata}
                  onChange={(m) => setEditingStep({ ...editingStep, metadata: m })}
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveStep}
              disabled={!editingStep?.title || upsertStep.isPending}
            >
              {upsertStep.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Type-Specific Metadata Fields ──────────────────

function MixStepFields({
  metadata,
  onChange,
}: {
  metadata: MixStepMetadata;
  onChange: (m: MixStepMetadata) => void;
}) {
  return (
    <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/20">
      <p className="font-sans text-xs text-muted-foreground font-medium">Mix Details</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-sans text-xs">Target Weight (g)</Label>
          <Input
            type="number"
            value={metadata.target_weight_g ?? ''}
            onChange={(e) =>
              onChange({ ...metadata, target_weight_g: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="e.g. 30"
          />
        </div>
        <div className="space-y-1">
          <Label className="font-sans text-xs">Ratio Guidance</Label>
          <Input
            value={metadata.ratio_guidance ?? ''}
            onChange={(e) => onChange({ ...metadata, ratio_guidance: e.target.value || undefined })}
            placeholder="e.g. 1:1.5"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="font-sans text-xs">Notes</Label>
        <Input
          value={metadata.notes ?? ''}
          onChange={(e) => onChange({ ...metadata, notes: e.target.value || undefined })}
          placeholder="Additional mixing notes"
        />
      </div>
    </div>
  );
}

function AssistantPrepFields({
  metadata,
  onChange,
}: {
  metadata: AssistantPrepStepMetadata;
  onChange: (m: AssistantPrepStepMetadata) => void;
}) {
  const [newTask, setNewTask] = useState('');

  const addTask = () => {
    if (!newTask.trim()) return;
    onChange({ tasks: [...(metadata.tasks ?? []), newTask.trim()] });
    setNewTask('');
  };

  const removeTask = (index: number) => {
    onChange({ tasks: metadata.tasks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/20">
      <p className="font-sans text-xs text-muted-foreground font-medium">Prep Tasks</p>
      <div className="space-y-1.5">
        {(metadata.tasks ?? []).map((task, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-sans text-sm text-foreground flex-1">{task}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTask(i)}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="e.g. Prepare foils"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={addTask} disabled={!newTask.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ProcessingFields({
  metadata,
  onChange,
}: {
  metadata: ProcessingStepMetadata;
  onChange: (m: ProcessingStepMetadata) => void;
}) {
  return (
    <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/20">
      <p className="font-sans text-xs text-muted-foreground font-medium">Processing Details</p>
      <div className="space-y-1">
        <Label className="font-sans text-xs">Recommended Minutes</Label>
        <Input
          type="number"
          value={metadata.recommended_minutes ?? ''}
          onChange={(e) =>
            onChange({
              ...metadata,
              recommended_minutes: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="e.g. 35"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={metadata.timer_enabled ?? false}
          onCheckedChange={(v) => onChange({ ...metadata, timer_enabled: v })}
        />
        <Label className="font-sans text-sm">Enable timer suggestion</Label>
      </div>
    </div>
  );
}
