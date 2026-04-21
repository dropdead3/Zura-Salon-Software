import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhyWeAskCallout } from "./WhyWeAskCallout";
import { SetupProgressPanel } from "./SetupProgressPanel";
import { PauseSetupDialog } from "./PauseSetupDialog";
import { SkipConfirmDialog } from "./SkipConfirmDialog";
import { STEP_UNLOCK_CONSEQUENCES, type StepRegistryEntry } from "./types";

interface StepShellProps {
  orgId: string;
  step: StepRegistryEntry;
  steps: StepRegistryEntry[];
  completedKeys: Set<string>;
  /** Reason text shown inside the Why-We-Ask disclosure. */
  whyWeAsk: string;
  /** Wave 13G.E — optional app-activation copy (e.g. "Zura Color Bar"). */
  activates?: string;
  activatesHint?: string;
  canAdvance: boolean;
  saving?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  /** Wave 13G.G — single-step re-entry (?step=…) hides the side rail. */
  singleStep?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onJumpToStep?: (key: string) => void;
  children: ReactNode;
  /** Slot for inline conflict banners */
  banners?: ReactNode;
  /** Optional inline confirmation rendered after the step completes */
  inlineConfirmation?: ReactNode;
}

/**
 * StepShell — chrome around every wizard step.
 * - Top: back arrow + pause exit + step pip progress
 * - Body: title, "why we're asking", step content, optional banners
 * - Footer: skip-for-now (if soft-required) + Next
 */
export function StepShell({
  orgId,
  step,
  steps,
  completedKeys,
  whyWeAsk,
  activates,
  activatesHint,
  canAdvance,
  saving,
  isFirst,
  isLast,
  singleStep,
  onBack,
  onNext,
  onSkip,
  onJumpToStep,
  children,
  banners,
  inlineConfirmation,
}: StepShellProps) {
  const [pauseOpen, setPauseOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const consequence = STEP_UNLOCK_CONSEQUENCES[step.key];

  // Wave 13G.G — mount the side rail (with completion timestamps) on lg+
  // for the full multi-step flow. Single-step re-entry stays body-only.
  const showSideRail = !singleStep;

  return (
    <div className="min-h-screen bg-background">
      <div
        className={
          showSideRail
            ? "container mx-auto px-4 sm:px-6 py-6 max-w-6xl lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10"
            : "container mx-auto px-4 sm:px-6 py-6 max-w-3xl"
        }
      >
        {showSideRail && (
          <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
            <SetupProgressPanel
              steps={steps}
              currentStepKey={step.key}
              completedKeys={completedKeys}
              variant="side"
              onStepClick={onJumpToStep}
              orgId={orgId}
            />
          </aside>
        )}
        <div className={showSideRail ? "min-w-0" : undefined}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isFirst}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPauseOpen(true)}
            className="gap-2 text-muted-foreground"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause setup
          </Button>
        </div>

        {/* Title block */}
        <div className="space-y-3 mb-6">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Step {step.step_order} {step.required ? "" : "· optional"}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-wide">
            {step.title}
          </h1>
        </div>

        {/* Why we're asking */}
        <div className="mb-6">
          <WhyWeAskCallout
            reason={whyWeAsk}
            unlocks={consequence}
            activates={activates}
            activatesHint={activatesHint}
          />
        </div>

        {/* Conflict banners */}
        {banners && <div className="mb-6 space-y-3">{banners}</div>}

        {/* Step body */}
        <div className="space-y-6">{children}</div>

        {/* Inline confirmation (anchor moment) */}
        {inlineConfirmation && (
          <div className="mt-8 rounded-xl border border-border bg-muted/20 p-5">
            {inlineConfirmation}
          </div>
        )}

        {/* Inline pip progress */}
        <div className="mt-10">
          <SetupProgressPanel
            steps={steps}
            currentStepKey={step.key}
            completedKeys={completedKeys}
            variant="inline"
            onStepClick={onJumpToStep}
          />
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <div>
            {step.required && onSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSkipOpen(true)}
                className="text-muted-foreground"
              >
                Skip for now
              </Button>
            )}
          </div>
          <Button
            type="button"
            onClick={onNext}
            disabled={!canAdvance || saving}
            className="gap-2 min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                {isLast ? "Review" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <PauseSetupDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        orgId={orgId}
        currentStepKey={step.key}
      />
      {onSkip && (
        <SkipConfirmDialog
          open={skipOpen}
          onOpenChange={setSkipOpen}
          onConfirm={() => {
            setSkipOpen(false);
            onSkip();
          }}
          stepTitle={step.title}
          consequence={consequence}
        />
      )}
    </div>
  );
}
