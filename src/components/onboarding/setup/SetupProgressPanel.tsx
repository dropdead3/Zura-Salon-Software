import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_UNLOCK_CONSEQUENCES, type StepRegistryEntry } from "./types";
import {
  formatRelativeShort,
  useOrgSetupStepCompletion,
} from "@/hooks/onboarding/useOrgSetupStepCompletion";

interface SetupProgressPanelProps {
  steps: StepRegistryEntry[];
  currentStepKey: string;
  completedKeys: Set<string>;
  variant?: "side" | "inline";
  onStepClick?: (stepKey: string) => void;
  /** Wave 13G.E — when provided, side variant queries completion timestamps. */
  orgId?: string | null;
}

/**
 * SetupProgressPanel — dual-mode progress visualization.
 *  - `side` variant: vertical, sticky in a left/right rail
 *  - `inline` variant: horizontal step pips below each step body
 *
 * Reads STEP_UNLOCK_CONSEQUENCES so the operator sees what each step unlocks.
 *
 * Wave 13G.E — `side` variant additionally reads `org_setup_step_completion`
 * and renders "Confirmed Xm ago" + retry hint under each completed step.
 * Honors visibility-contract: no row → no timestamp, no orgId → no query.
 */
export function SetupProgressPanel({
  steps,
  currentStepKey,
  completedKeys,
  variant = "side",
  onStepClick,
  orgId = null,
}: SetupProgressPanelProps) {
  // Only the side variant cares about completion timestamps; inline pips stay lean.
  const completionEnabled = variant === "side" && !!orgId;
  const { data: completionMap = {} } = useOrgSetupStepCompletion(
    completionEnabled ? orgId : null,
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-1.5 justify-center pt-2">
        {steps.map((step) => {
          const completed = completedKeys.has(step.key);
          const current = step.key === currentStepKey;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepClick?.(step.key)}
              disabled={!completed && !current}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                current ? "w-8 bg-foreground" : completed ? "w-4 bg-foreground/60" : "w-4 bg-border",
                (completed || current) && "cursor-pointer hover:bg-foreground/80",
              )}
              aria-label={step.title}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 pb-2">
        Setup
      </div>
      {steps.map((step) => {
        const completed = completedKeys.has(step.key);
        const current = step.key === currentStepKey;
        const unlocks = STEP_UNLOCK_CONSEQUENCES[step.key];
        const completion = completionMap[step.key];
        const completedRel = completion ? formatRelativeShort(completion.completed_at) : null;
        const retried = (completion?.attempt_count ?? 1) > 1;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick?.(step.key)}
            disabled={!completed && !current}
            className={cn(
              "w-full text-left rounded-lg px-3 py-2.5 transition-all flex items-start gap-3",
              current && "bg-muted/60",
              !current && "hover:bg-muted/30",
              !completed && !current && "opacity-50 cursor-not-allowed",
            )}
          >
            <div
              className={cn(
                "shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-all",
                completed
                  ? "border-foreground bg-foreground text-background"
                  : current
                    ? "border-foreground bg-background"
                    : "border-border bg-background",
              )}
            >
              {completed ? (
                <Check className="w-3 h-3" strokeWidth={2.5} />
              ) : (
                <span className="font-sans text-[10px] font-medium">
                  {step.step_order === 0.5 || step.step_order % 1 !== 0
                    ? "+"
                    : Math.floor(step.step_order)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-sans text-xs leading-tight",
                  current ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {step.title}
              </div>
              {completed && completedRel && (
                <div className="font-sans text-[10px] text-muted-foreground/70 mt-1 leading-snug">
                  Confirmed {completedRel}
                  {retried && (
                    <span className="text-muted-foreground/60"> · retried</span>
                  )}
                </div>
              )}
              {current && unlocks && (
                <div className="font-sans text-[10px] text-muted-foreground/70 mt-1 leading-snug">
                  Unlocks: {unlocks}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
