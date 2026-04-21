import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { BootLuxeLoader } from "@/components/ui/BootLuxeLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useStepRegistry } from "@/hooks/onboarding/useStepRegistry";
import { useOrgSetupDraft } from "@/hooks/onboarding/useOrgSetupDraft";
import { useStepEventTelemetry } from "@/hooks/onboarding/useStepEventTelemetry";
import { useConflictRules, detectConflicts } from "@/hooks/onboarding/useConflictRules";
import { useCommitOrgSetup } from "@/hooks/onboarding/useCommitOrgSetup";
import { OnboardingIntroScreen } from "@/components/onboarding/setup/OnboardingIntroScreen";
import { StepShell } from "@/components/onboarding/setup/StepShell";
import { ConflictBanner } from "@/components/onboarding/setup/ConflictBanner";
import { Step0FitCheck } from "@/components/onboarding/setup/Step0FitCheck";
import { Step1Identity } from "@/components/onboarding/setup/Step1Identity";
import { Step2Footprint } from "@/components/onboarding/setup/Step2Footprint";
import { Step3Team } from "@/components/onboarding/setup/Step3Team";
import { Step4Compensation } from "@/components/onboarding/setup/Step4Compensation";
import { Step5Catalog } from "@/components/onboarding/setup/Step5Catalog";
import { Step6Standards } from "@/components/onboarding/setup/Step6Standards";
import { Step7Intent } from "@/components/onboarding/setup/Step7Intent";
import { Step7_5AppRecommendations } from "@/components/onboarding/setup/Step7_5AppRecommendations";
import { SetupSummary } from "@/components/onboarding/setup/SetupSummary";
import { SetupCommitResult } from "@/components/onboarding/setup/SetupCommitResult";
import type { StepRegistryEntry, StepProps } from "@/components/onboarding/setup/types";
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
  Step4Compensation,
  Step5Catalog,
  Step6Standards,
  Step7Intent,
  Step7_5AppRecommendations,
};

type CommitResult = Awaited<ReturnType<ReturnType<typeof useCommitOrgSetup>["mutateAsync"]>>;

/**
 * OrganizationSetup — registry-driven wizard host.
 * Renders the intro, iterates the active step registry, then transitions to
 * the Summary screen and the CommitResult surface (partial-success contract).
 */
export default function OrganizationSetup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const orgId = params.get("org");
  const skipIntro = params.get("skipIntro") === "1";
  const singleStepKey = params.get("step"); // single-step re-entry from settings
  const returnTo = params.get("returnTo");

  const [showIntro, setShowIntro] = useState(!skipIntro && !singleStepKey);
  const [phase, setPhase] = useState<"steps" | "summary" | "result">("steps");
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepValid, setStepValid] = useState(false);
  const stepDataRef = useRef<Record<string, unknown>>({});

  const { data: steps = [], isLoading: registryLoading } = useStepRegistry();
  const { data: draft, save, isLoading: draftLoading } = useOrgSetupDraft(orgId);
  const { data: rules = [] } = useConflictRules();
  const telemetry = useStepEventTelemetry();
  const commit = useCommitOrgSetup();

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

  // Resume at draft's current_step on first load — or jump to single-step from settings
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !renderableSteps.length) return;
    resumedRef.current = true;
    if (singleStepKey) {
      const idx = renderableSteps.findIndex((s) => s.key === singleStepKey);
      if (idx >= 0) {
        setCurrentIndex(idx);
        setShowIntro(false);
      }
      return;
    }
    if (!draft) return;
    const resumeAt = draft.current_step;
    if (typeof resumeAt === "number" && resumeAt >= 0 && resumeAt < renderableSteps.length) {
      setCurrentIndex(resumeAt);
      if (resumeAt > 0) setShowIntro(false);
    }
  }, [draft, renderableSteps.length, singleStepKey]);

  // Telemetry: viewed
  useEffect(() => {
    if (!orgId || !currentStep || showIntro || phase !== "steps") return;
    telemetry.mutate({
      organization_id: orgId,
      step_number: currentStep.step_order,
      event: "viewed",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentStep?.key, showIntro, phase]);

  const conflicts = useMemo(() => {
    if (!rules.length) return [];
    return detectConflicts(rules, draftStepData);
  }, [rules, draftStepData]);

  const handleStepChange = useCallback((data: Record<string, unknown>) => {
    stepDataRef.current = data;
  }, []);

  const persist = async (advance: 1 | -1 | 0) => {
    if (!orgId || !currentStep) return;
    const isLast = currentIndex === renderableSteps.length - 1;
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
      // Single-step re-entry: commit just this step and bounce back to settings
      if (advance === 1 && singleStepKey) {
        toast.success("Saved");
        navigate(returnTo || "/dashboard");
        return;
      }
      // If we just completed the last step, transition to summary
      if (advance === 1 && isLast) {
        setPhase("summary");
        return;
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
    if (idx >= 0) {
      setCurrentIndex(idx);
      setPhase("steps");
    }
  };

  const handleCommit = async () => {
    if (!orgId) return;
    const acknowledged = conflicts
      .filter((c) => c.severity !== "block")
      .map((c) => c.rule_key);
    try {
      const res = await commit.mutateAsync({
        organization_id: orgId,
        acknowledged_conflicts: acknowledged,
      });
      setCommitResult(res);
      setPhase("result");
    } catch (err) {
      console.error("[OrganizationSetup] commit failed:", err);
    }
  };

  // Loading and gating
  if (authLoading) return <BootLuxeLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!orgId) return <Navigate to="/dashboard" replace />;
  if (registryLoading || draftLoading) return <BootLuxeLoader fullScreen />;

  if (showIntro && phase === "steps") {
    return <OnboardingIntroScreen onBegin={() => setShowIntro(false)} />;
  }

  if (phase === "result" && commitResult) {
    return (
      <SetupCommitResult
        result={commitResult}
        onContinue={() => navigate("/dashboard")}
      />
    );
  }

  if (phase === "summary") {
    return (
      <>
        <Helmet>
          <title>Final review — Zura setup</title>
        </Helmet>
        <SetupSummary
          orgId={orgId}
          draftData={draftStepData}
          steps={renderableSteps}
          onEditStep={handleJump}
          onCommit={handleCommit}
          committing={commit.isPending}
        />
      </>
    );
  }

  if (!currentStep) {
    // Shouldn't happen after Wave 3 — defensive fallback
    setPhase("summary");
    return <BootLuxeLoader fullScreen />;
  }

  const StepComponent = STEP_COMPONENTS[currentStep.component_key];
  const stepBanners = conflicts.filter((c) => {
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
        <title>{currentStep.title.replace("{{PLATFORM_NAME}}", "Zura")} — Zura setup</title>
      </Helmet>
      <StepShell
        orgId={orgId}
        step={currentStep}
        steps={renderableSteps}
        completedKeys={completedKeys}
        whyWeAsk={WHY_WE_ASK[currentStep.key] ?? ""}
        canAdvance={stepValid && !blockingConflict}
        saving={save.isPending}
        isFirst={singleStepKey ? false : currentIndex === 0}
        isLast={singleStepKey ? false : currentIndex === renderableSteps.length - 1}
        onBack={() => {
          if (singleStepKey) {
            navigate(returnTo || "/dashboard");
            return;
          }
          persist(-1);
        }}
        onNext={() => persist(1)}
        onSkip={!singleStepKey && currentStep.required ? handleSkip : undefined}
        onJumpToStep={singleStepKey ? undefined : handleJump}
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
