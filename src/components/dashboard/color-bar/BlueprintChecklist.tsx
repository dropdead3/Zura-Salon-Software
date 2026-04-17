/**
 * BlueprintChecklist — Stylist-facing advisory checklist for appointment workspace.
 *
 * Displays ordered blueprint steps with checkboxes. Completion state is in-memory only.
 * Steps can be marked complete or skipped — purely advisory, never blocking.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Beaker,
  HandHelping,
  Paintbrush,
  Timer,
  Droplets,
  CheckCircle2,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import {
  STEP_TYPE_LABELS,
  type BlueprintStepType,
  type BlueprintStep,
  type ProcessingStepMetadata,
  type AssistantPrepStepMetadata,
} from '@/lib/color-bar/blueprint-engine';
import { useServiceBlueprint } from '@/hooks/color-bar/useServiceBlueprints';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

const STEP_ICONS: Record<BlueprintStepType, React.ReactNode> = {
  mix_step: <Beaker className="w-3.5 h-3.5" />,
  assistant_prep_step: <HandHelping className="w-3.5 h-3.5" />,
  application_step: <Paintbrush className="w-3.5 h-3.5" />,
  processing_step: <Timer className="w-3.5 h-3.5" />,
  rinse_step: <Droplets className="w-3.5 h-3.5" />,
  finish_step: <CheckCircle2 className="w-3.5 h-3.5" />,
};

interface BlueprintChecklistProps {
  serviceId?: string;
  className?: string;
}

export function BlueprintChecklist({ serviceId, className }: BlueprintChecklistProps) {
  const { data: steps = [], isLoading } = useServiceBlueprint(serviceId);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const completionCount = completedSteps.size;
  const totalCount = steps.length;

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  if (!serviceId || isLoading) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-24">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      );
    }
    // Visibility Contract: no service selected → no blueprint to render.
    // Reason 'no-service-id' is contract-specific: this is upstream-prop absence,
    // distinct from 'no-data' (which means the query ran and returned empty).
    reportVisibilitySuppression('blueprint-checklist', 'no-service-id', {
      hasServiceId: false,
    });
    return null;
  }

  if (steps.length === 0) {
    // Visibility Contract: blueprint exists but has zero steps.
    reportVisibilitySuppression('blueprint-checklist', 'no-data', {
      stepCount: 0,
      serviceId,
    });
    return null;
  }

  return (
    <Card className={`rounded-xl bg-card/80 backdrop-blur-xl border-border ${className ?? ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Blueprint</CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground">
              {completionCount}/{totalCount} steps complete
            </CardDescription>
          </div>
        </div>
        {completionCount === totalCount && totalCount > 0 && (
          <Badge variant="outline" className="text-[10px] text-success border-success/30">
            All Done
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-1.5">
        {steps.map((step) => (
          <ChecklistItem
            key={step.id}
            step={step}
            isComplete={completedSteps.has(step.id)}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ChecklistItem({
  step,
  isComplete,
  onToggle,
}: {
  step: BlueprintStep;
  isComplete: boolean;
  onToggle: () => void;
}) {
  const stepType = step.step_type as BlueprintStepType;
  const meta = step.metadata;

  return (
    <div
      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
        isComplete
          ? 'border-success/20 bg-success/5 opacity-70'
          : 'border-border/60 bg-background/50 hover:bg-muted/30'
      }`}
      onClick={onToggle}
    >
      <Checkbox
        checked={isComplete}
        onCheckedChange={() => onToggle()}
        className="mt-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground mt-0.5">
        {STEP_ICONS[stepType]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-sans text-sm ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}
          >
            {step.title}
          </span>
          <Badge variant="outline" className="text-[9px] shrink-0">
            {STEP_TYPE_LABELS[stepType]}
          </Badge>
        </div>

        {step.description && (
          <p className="font-sans text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}

        {/* Processing time hint */}
        {stepType === 'processing_step' && (meta as ProcessingStepMetadata).recommended_minutes && (
          <p className="font-sans text-xs text-muted-foreground mt-0.5">
            ⏱ {(meta as ProcessingStepMetadata).recommended_minutes} min recommended
          </p>
        )}

        {/* Prep tasks */}
        {stepType === 'assistant_prep_step' &&
          (meta as AssistantPrepStepMetadata).tasks?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(meta as AssistantPrepStepMetadata).tasks.map((task, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {task}
                </Badge>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
