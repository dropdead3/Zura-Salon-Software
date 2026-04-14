import { CheckCircle2, Circle, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { FormSuccess } from '@/components/ui/form-success';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface ChecklistStep {
  label: string;
  description: string;
  complete: boolean;
  loading?: boolean;
  /** Navigation action for the current (next) step */
  action?: { label: string; onClick: () => void };
}

interface ZuraPayActivationChecklistProps {
  connectStatus: string | undefined;
  detailsSubmitted: boolean;
  isLocationConnected: boolean;
  hasTerminalLocations: boolean;
  hasReaders: boolean;
  hasFirstTransaction: boolean | undefined;
  locationHasOwnAccount?: boolean;
}

export function ZuraPayActivationChecklist({
  connectStatus,
  detailsSubmitted,
  isLocationConnected,
  hasTerminalLocations,
  hasReaders,
  hasFirstTransaction,
  locationHasOwnAccount,
}: ZuraPayActivationChecklistProps) {
  const [, setSearchParams] = useSearchParams();
  const { dashPath } = useOrgDashboardPath();

  const goToFleetTab = () => setSearchParams((prev) => { prev.set('subtab', 'fleet'); return prev; });

  const steps: ChecklistStep[] = [
    {
      label: 'Create Account',
      description: 'Set up your Zura Pay account to start processing payments',
      complete: locationHasOwnAccount
        ? true
        : !!connectStatus && connectStatus !== 'not_connected',
    },
    {
      label: 'Complete Verification',
      description: 'Submit business details and verify your identity in the activation panel above',
      complete: locationHasOwnAccount
        ? true
        : connectStatus === 'active',
    },
    {
      label: 'Connect Location',
      description: 'Link a salon location using the Location Mapping section in the Fleet tab',
      complete: isLocationConnected,
      action: { label: 'Go to Fleet tab', onClick: goToFleetTab },
    },
    {
      label: 'Create Terminal Location',
      description: 'Go to the Fleet tab and create a terminal location for your salon',
      complete: hasTerminalLocations,
      action: { label: 'Go to Fleet tab', onClick: goToFleetTab },
    },
    {
      label: 'Pair Reader',
      description: 'Register a reader in the Fleet tab — you\'ll need hardware from the Hardware tab first',
      complete: hasReaders,
      action: { label: 'Go to Fleet tab', onClick: goToFleetTab },
    },
    {
      label: 'First Transaction',
      description: 'Go to the Scheduler, select an appointment, and check out using Zura Pay on a paired reader',
      complete: !!hasFirstTransaction,
      loading: hasFirstTransaction === undefined,
      action: { label: 'Go to Scheduler', onClick: () => { window.location.href = dashPath('/schedule'); } },
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;

  // Find the first incomplete step index for "current step" highlight
  const currentStepIndex = steps.findIndex((s) => !s.complete);

  if (allComplete) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/[0.04]">
        <div className="p-6">
          <FormSuccess
            title="Activation Complete"
            description="All steps are finished — Zura Pay is fully active for this location."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04]">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className={tokens.card.title}>
              Activation Progress
              <MetricInfoTooltip description="Complete each step to fully activate Zura Pay for your organization." />
            </h3>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {steps.length} steps complete
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 pt-0">
        {/* Progress bar */}
        <div className="w-full h-2 bg-amber-500/15 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={idx} className={cn(
                'flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors',
                isCurrent && 'bg-amber-500/[0.06]',
              )}>
                {step.loading ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground/40 mt-0.5 shrink-0 animate-spin" />
                ) : step.complete ? (
                  <CheckCircle2 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                ) : isCurrent ? (
                  <Circle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    step.complete ? 'text-foreground' : isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-amber-500">— Next</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
