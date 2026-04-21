/**
 * PolicyConfiguratorStepper (Wave 28.13)
 *
 * Horizontal numbered stepper that replaces the Rules / Applicability /
 * Surfaces / Drafts tab strip. Visualizes a sequential 4-step (or 3-step
 * for internal-only policies) flow with click-to-jump navigation.
 *
 * State per step: complete | current | upcoming. No "skipped" rendering —
 * hidden steps simply re-flow numbering, keeping the visual clean.
 *
 * Doctrine:
 *  - Silence is meaningful: completion is a check, not a percentage.
 *  - Operator edits are sacred: clicking back never resets data.
 *  - No alert fatigue: no toast on step transitions; the visual itself is
 *    the signal.
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepId, StepMeta } from '@/lib/policy/configurator-steps';

interface Props {
  steps: StepMeta[];
  activeStep: StepId;
  completedSteps: Record<StepId, boolean>;
  onStepClick: (id: StepId) => void;
}

export function PolicyConfiguratorStepper({
  steps,
  activeStep,
  completedSteps,
  onStepClick,
}: Props) {
  const activeIndex = steps.findIndex((s) => s.id === activeStep);
  const activeMeta = steps[activeIndex] ?? steps[0];

  return (
    <div className="space-y-4">
      {/* Step row — circles + labels + connectors */}
      <div className="flex items-start gap-2">
        {steps.map((step, idx) => {
          const isComplete = !!completedSteps[step.id];
          const isCurrent = step.id === activeStep;
          const stepNumber = idx + 1;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              {/* Circle + label cluster (clickable) */}
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                className="group flex flex-col items-start gap-2 min-w-0 flex-shrink-0 text-left"
              >
                <div className="flex items-center gap-3 w-full">
                  <span
                    className={cn(
                      'relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-sans font-medium transition-all duration-200 flex-shrink-0',
                      isComplete &&
                        'bg-primary text-primary-foreground',
                      isCurrent &&
                        !isComplete &&
                        'bg-primary text-primary-foreground ring-4 ring-primary/15',
                      !isComplete &&
                        !isCurrent &&
                        'bg-muted text-muted-foreground border border-border group-hover:border-foreground/30 group-hover:text-foreground',
                    )}
                  >
                    {isComplete ? <Check className="w-4 h-4" /> : stepNumber}
                  </span>
                  <span
                    className={cn(
                      'font-sans text-xs whitespace-nowrap transition-colors',
                      isCurrent && 'text-foreground font-medium',
                      !isCurrent && isComplete && 'text-foreground',
                      !isCurrent && !isComplete && 'text-muted-foreground group-hover:text-foreground/80',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </button>

              {/* Connector line — fills remaining space between circles */}
              {!isLast && (
                <div className="flex-1 flex items-center pt-4 px-2 min-w-[12px]">
                  <div
                    className={cn(
                      'h-px w-full transition-colors duration-200',
                      isComplete ? 'bg-primary/60' : 'bg-border',
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active step purpose statement */}
      <div className="pt-2">
        <p className="font-sans text-[11px] uppercase tracking-wider text-muted-foreground">
          Step {activeIndex + 1} of {steps.length} — {activeMeta.label}
        </p>
        <p className="font-sans text-sm text-muted-foreground mt-1.5 max-w-2xl">
          {activeMeta.purpose}
        </p>
      </div>
    </div>
  );
}
