import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { BootLuxeLoader } from "@/components/ui/BootLuxeLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useStepRegistry } from "@/hooks/onboarding/useStepRegistry";
import { useOrgSetupDraft } from "@/hooks/onboarding/useOrgSetupDraft";
import { useStepEventTelemetry } from "@/hooks/onboarding/useStepEventTelemetry";
import { useConflictRules, detectConflicts } from "@/hooks/onboarding/useConflictRules";
import { OnboardingIntroScreen } from "@/components/onboarding/setup/OnboardingIntroScreen";
import { StepShell } from "@/components/onboarding/setup/StepShell";
import { ConflictBanner } from "@/components/onboarding/setup/ConflictBanner";
import { Step0FitCheck } from "@/components/onboarding/setup/Step0FitCheck";
import { Step1Identity } from "@/components/onboarding/setup/Step1Identity";
import { Step2Footprint } from "@/components/onboarding/setup/Step2Footprint";
import { Step3Team } from "@/components/onboarding/setup/Step3Team";
import type { StepRegistryEntry, StepProps } from "@/components/onboarding/setup/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const WHY_WE_ASK: Record<string, string> = {
  step_0_fit_check:
    "We want to know quickly if Zura is the right fit for your operation. If it isn't, we'll say so — your time matters more than our funnel.",
  step_1_identity:
    "Your business name appears on every invoice, payroll statement, and client communication. Your timezone drives the dashboard clock and reporting day boundaries.",
  step_2_footprint:
    "Locations drive cross-location benchmarking, state law applicability, and operational scope. Without locations, intelligence cannot be scoped correctly.",
  step_3_team:
    "Roles drive your career pathway, compensation eligibility, and which intelligence surfaces apply. Apprentices and booth renters have different rules than commission staff.",
  step_4_compensation:
    "Compensation architecture is the foundation of payroll, margin protection, and commission breach detection. This is the single most important configuration.",
  step_5_catalog:
    "Service categories drive Color Bar eligibility, retail commission rules, and policy applicability (e.g. minor consent for chemical services).",
  step_6_standards:
    "Operating standards govern tip distribution, refund handling, and policy enforcement. They protect margin and reduce ambiguity for staff.",
  step_7_intent:
    "What you want from Zura shapes your sidebar persona, recommendation engine, and the order intelligence surfaces.",
  step_7_5_apps:
    "Based on everything you've told us, these are the apps that fit your operation. You can install or remove any of them later.",
};

const STEP_COMPONENTS: Record<string, React.ComponentType<StepProps<any>>> = {
  Step0FitCheck,
  Step1Identity,
  Step2Footprint,
  Step3Team,
};

/**
 * OrganizationSetup — registry-driven wizard host.
 * Renders the intro, then iterates the active step registry. Each step writes
 * to a per-step draft slice; conflicts are surfaced inline; commit happens at
 * the summary step (Wave 3).
 */
export default function OrganizationSetup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const orgId = params.get("org");
  const skipIntro = params.get("skipIntro") === "1";

  const [showIntro, setShowIntro] = useState(!skipIntro);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepValid, setStepValid] = useState(false);
  const stepDataRef = useRef<Record<string, unknown>>({});

  const { data: steps = [], isLoading: registryLoading } = useStepRegistry();
  const { data: draft, save, isLoading: draftLoading } = useOrgSetupDraft(orgId);
  const { data: rules = [] } = useConflictRules();
  const telemetry = useStepEventTelemetry();

  const renderableSteps = useMemo(
    () => steps.filter((s) => STEP_COMPONENTS[s.component_key]),
    [steps],
  );

  const currentStep: StepRegistryEntry | undefined = renderableSteps[currentIndex];

  const draftStepData = (draft?.step_data as Record<string, Record<string, unknown>> | undefined) ?? {};
  const completedKeys = useMemo(
    () => new Set(Object.keys(draftStepData)),
    [draftStepData],
  );

  // Resume at draft's current_step on first load
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !draft || !renderableSteps.length) return;
    resumedRef.current = true;
    const resumeAt = draft.current_step;
    if (typeof resumeAt === "number" && resumeAt >= 0 && resumeAt < renderableSteps.length) {
      setCurrentIndex(resumeAt);
      if (resumeAt > 0) setShowIntro(false);
    }
  }, [draft, renderableSteps.length]);

  // Telemetry: viewed
  useEffect(() => {
    if (!orgId || !currentStep || showIntro) return;
    telemetry.mutate({
      organization_id: orgId,
      step_number: currentStep.step_order,
      event: "viewed",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentStep?.key, showIntro]);

  const conflicts = useMemo(() => {
    if (!rules.length) return [];
    return detectConflicts(rules, draftStepData);
  }, [rules, draftStepData]);

  const handleStepChange = useCallback((data: Record<string, unknown>) => {
    stepDataRef.current = data;
  }, []);

  const persist = async (advance: 1 | -1 | 0) => {
    if (!orgId || !currentStep) return;
    const nextIndex = Math.max(0, Math.min(renderableSteps.length - 1, currentIndex + advance));
    try {
      if (advance >= 0 && Object.keys(stepDataRef.current).length > 0) {
        await save.mutateAsync({
          stepKey: currentStep.key,
          data: stepDataRef.current,
          currentStep: nextIndex,
        });
      }
      if (advance === 1) {
        telemetry.mutate({
          organization_id: orgId,
          step_number: currentStep.step_order,
          event: "completed",
        });
      }
      setCurrentIndex(nextIndex);
      setStepValid(false);
      stepDataRef.current = {};
    } catch (err) {
      toast.error("Could not save progress. Try again.");
      console.error(err);
    }
  };

  const handleSkip = async () => {
    if (!orgId || !currentStep) return;
    telemetry.mutate({
      organization_id: orgId,
      step_number: currentStep.step_order,
      event: "skipped",
    });
    await persist(1);
  };

  const handleJump = (stepKey: string) => {
    const idx = renderableSteps.findIndex((s) => s.key === stepKey);
    if (idx >= 0) setCurrentIndex(idx);
  };

  // Loading and gating
  if (authLoading) return <BootLuxeLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!orgId) return <Navigate to="/dashboard" replace />;
  if (registryLoading || draftLoading) return <BootLuxeLoader fullScreen />;

  if (showIntro) {
    return <OnboardingIntroScreen onBegin={() => setShowIntro(false)} />;
  }

  if (!currentStep) {
    // All renderable steps completed in this wave; future waves render summary
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Helmet>
          <title>Setup almost done — Zura</title>
        </Helmet>
        <div className="max-w-md text-center space-y-6">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Wave 2 milestone
          </div>
          <h1 className="font-display text-2xl tracking-wide">
            You've completed the foundational steps.
          </h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            Compensation, catalog, standards, intent, and apps will arrive in
            the next build wave. Your progress is saved.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep.component_key];
  const stepBanners = conflicts.filter((c) => {
    // Only surface conflicts whose triggers include current step or whose
    // resolution_step is the current step.
    const rule = rules.find((r) => r.key === c.rule_key);
    if (!rule) return false;
    return (
      rule.trigger_steps.includes(currentStep.key) ||
      c.resolution_step === currentStep.key
    );
  });
  const blockingConflict = stepBanners.some((c) => c.severity === "block");

  return (
    <>
      <Helmet>
        <title>{currentStep.title} — Zura setup</title>
      </Helmet>
      <StepShell
        orgId={orgId}
        step={currentStep}
        steps={renderableSteps}
        completedKeys={completedKeys}
        whyWeAsk={WHY_WE_ASK[currentStep.key] ?? ""}
        canAdvance={stepValid && !blockingConflict}
        saving={save.isPending}
        isFirst={currentIndex === 0}
        isLast={currentIndex === renderableSteps.length - 1}
        onBack={() => persist(-1)}
        onNext={() => persist(1)}
        onSkip={currentStep.required ? handleSkip : undefined}
        onJumpToStep={handleJump}
        banners={
          stepBanners.length > 0
            ? stepBanners.map((c) => (
                <ConflictBanner
                  key={c.rule_key}
                  conflict={c}
                  onJumpToStep={handleJump}
                />
              ))
            : undefined
        }
      >
        <StepComponent
          orgId={orgId}
          stepKey={currentStep.key}
          initialData={(draftStepData[currentStep.key] as any) ?? null}
          draftData={draftStepData}
          onChange={handleStepChange}
          onValidityChange={setStepValid}
        />
      </StepShell>
    </>
  );
}
