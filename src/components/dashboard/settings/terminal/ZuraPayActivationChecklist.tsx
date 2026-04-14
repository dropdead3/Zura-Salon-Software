import { useState } from 'react';
import { CheckCircle2, Circle, ArrowRight, Loader2, ExternalLink, CalendarPlus, CalendarDays } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { FormSuccess } from '@/components/ui/form-success';
import { Button } from '@/components/ui/button';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistStep {
  label: string;
  description: string;
  complete: boolean;
  loading?: boolean;
  /** Navigation action for the current (next) step */
  action?: { label: string; onClick: () => void };
  /** Custom render for the current step's action area */
  renderAction?: () => React.ReactNode;
}

interface ZuraPayActivationChecklistProps {
  connectStatus: string | undefined;
  detailsSubmitted: boolean;
  isLocationConnected: boolean;
  hasTerminalLocations: boolean;
  hasReaders: boolean;
  hasFirstTransaction: boolean | undefined;
  locationHasOwnAccount?: boolean;
  organizationId?: string;
  locationId?: string | null;
  userId?: string;
  userName?: string;
}

export function ZuraPayActivationChecklist({
  connectStatus,
  detailsSubmitted,
  isLocationConnected,
  hasTerminalLocations,
  hasReaders,
  hasFirstTransaction,
  locationHasOwnAccount,
  organizationId,
  locationId,
  userId,
  userName,
}: ZuraPayActivationChecklistProps) {
  const [, setSearchParams] = useSearchParams();
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();

  const [creatingTestAppt, setCreatingTestAppt] = useState(false);
  const [testApptCreated, setTestApptCreated] = useState(false);

  const goToFleetTab = () => setSearchParams((prev) => { prev.set('subtab', 'fleet'); return prev; });

  const handleCreateTestAppt = async () => {
    if (!organizationId || !userId) {
      toast.error('Missing user or organization context');
      return;
    }

    setCreatingTestAppt(true);
    try {
      // Round to next 15-min slot
      const now = new Date();
      const minutes = now.getMinutes();
      const roundedMinutes = Math.ceil((minutes + 15) / 15) * 15;
      const startTime = new Date(now);
      startTime.setMinutes(roundedMinutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);

      const appointmentDate = startTime.toISOString().split('T')[0];

      const { error } = await supabase.from('appointments').insert({
        organization_id: organizationId,
        location_id: locationId || undefined,
        staff_user_id: userId,
        staff_name: userName || 'Staff Member',
        client_name: 'Test Client',
        service_name: 'Zura Pay Test Checkout',
        appointment_date: appointmentDate,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: 30,
        total_price: 0.50,
        original_price: 0.50,
        status: 'confirmed',
        import_source: 'zura_test',
        notes: 'Auto-created for Zura Pay activation test',
        payment_status: 'unpaid',
      });

      if (error) throw error;

      setTestApptCreated(true);
      toast.success('Test appointment created on today\'s schedule');
    } catch (err: any) {
      toast.error('Failed to create test appointment', { description: err.message });
    } finally {
      setCreatingTestAppt(false);
    }
  };

  const renderFirstTransactionAction = () => {
    if (testApptCreated) {
      return (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>$0.50 test appointment added to today's schedule</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            onClick={() => navigate(dashPath('/schedule'))}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            View Today's Schedule
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-muted-foreground">
          We'll create a $0.50 test appointment on today's schedule so you can practice the full checkout flow.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          onClick={handleCreateTestAppt}
          disabled={creatingTestAppt || !organizationId || !userId}
        >
          {creatingTestAppt ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CalendarPlus className="w-3.5 h-3.5" />
          )}
          Create Test Appointment ($0.50)
        </Button>
      </div>
    );
  };

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
      description: 'Run a test checkout to confirm everything works end-to-end',
      complete: !!hasFirstTransaction,
      loading: hasFirstTransaction === undefined,
      renderAction: renderFirstTransactionAction,
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
                  {isCurrent && step.renderAction && step.renderAction()}
                  {isCurrent && !step.renderAction && step.action && (
                    <button
                      onClick={step.action.onClick}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors"
                    >
                      {step.action.label}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
