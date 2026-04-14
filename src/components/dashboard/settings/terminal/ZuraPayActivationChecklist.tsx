import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface ChecklistStep {
  label: string;
  description: string;
  complete: boolean;
}

interface ZuraPayActivationChecklistProps {
  connectStatus: string | undefined;
  detailsSubmitted: boolean;
  isLocationConnected: boolean;
  hasTerminalLocations: boolean;
  hasReaders: boolean;
  hasFirstTransaction: boolean;
  locationHasOwnAccount?: boolean;
}

export function ZuraPayActivationChecklist({
  connectStatus,
  detailsSubmitted,
  isLocationConnected,
  hasTerminalLocations,
  hasReaders,
  hasFirstTransaction,
}: ZuraPayActivationChecklistProps) {
  const steps: ChecklistStep[] = [
    {
      label: 'Create Account',
      description: 'Set up your Zura Pay account to start processing payments',
      complete: !!connectStatus && connectStatus !== 'not_connected',
    },
    {
      label: 'Complete Verification',
      description: 'Submit business details and verify your identity',
      complete: connectStatus === 'active',
    },
    {
      label: 'Connect Location',
      description: 'Link at least one salon location to Zura Pay',
      complete: isLocationConnected,
    },
    {
      label: 'Create Terminal Location',
      description: 'Create a terminal location and pair a reader to accept card-present payments',
      complete: hasTerminalLocations,
    },
    {
      label: 'Pair Reader',
      description: 'Register a Zura Pay reader to accept card-present payments',
      complete: hasReaders,
    },
    {
      label: 'First Transaction',
      description: 'Process your first payment to confirm everything works',
      complete: hasFirstTransaction,
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;

  if (allComplete) return null;

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
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              {step.complete ? (
                <CheckCircle2 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 mt-0.5 shrink-0" />
              )}
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  step.complete ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
