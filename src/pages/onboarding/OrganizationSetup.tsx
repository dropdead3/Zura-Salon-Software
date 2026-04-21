import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { BootLuxeLoader } from "@/components/ui/BootLuxeLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useStepRegistry } from "@/hooks/onboarding/useStepRegistry";
import { useOrgSetupDraft } from "@/hooks/onboarding/useOrgSetupDraft";
import { useStepEventTelemetry, type StepEvent } from "@/hooks/onboarding/useStepEventTelemetry";
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

interface WhyWeAskEntry {
  reason: string;
  /** Apps automatically activated by completing this step. */
  activates?: string;
  /** Optional contextual hint paired with `activates`. */
  activatesHint?: string;
}

const WHY_WE_ASK: Record<string, WhyWeAskEntry> = {
  step_0_fit_check: {
    reason:
      "We want to know quickly if {{PLATFORM_NAME}} is the right fit for your operation. If it isn't, we'll say so — your time matters more than our funnel.",
  },
  step_1_identity: {
    reason:
      "Your business name appears on every invoice, payroll statement, and client communication. Your timezone drives the dashboard clock and reporting day boundaries.",
  },
  step_2_footprint: {
    reason:
      "Locations drive cross-location benchmarking, state law applicability, and operational scope. Without locations, intelligence cannot be scoped correctly.",
  },
  step_3_team: {
    reason:
      "Roles drive your career pathway, compensation eligibility, and which intelligence surfaces apply. Apprentices and booth renters have different rules than commission staff.",
    activates: "{{PLATFORM_NAME}} Payroll",
    activatesHint: "installs automatically when commission models are configured",
  },
  step_4_compensation: {
    reason:
      "Compensation architecture is the foundation of payroll, margin protection, and commission breach detection. This is the single most important configuration.",
  },
  step_5_catalog: {
    reason:
      "Service categories drive Color Bar eligibility, retail commission rules, and policy applicability (e.g. minor consent for chemical services).",
    activates: "{{PLATFORM_NAME}} Color Bar",
    activatesHint: "installs automatically when you select chemical or color services",
  },
  step_6_standards: {
    reason:
      "Operating standards govern tip distribution, refund handling, and policy enforcement. They protect margin and reduce ambiguity for staff.",
  },
  step_7_intent: {
    reason:
      "What you want from {{PLATFORM_NAME}} shapes your sidebar persona, recommendation engine, and the order intelligence surfaces.",
  },
  step_7_5_apps: {
    reason:
      "Based on everything you've told us, these are the apps that fit your operation. You can install or remove any of them later.",
  },
};

const PLATFORM_NAME = "Zura";
const tokenize = (s: string) => s.replace(/\{\{PLATFORM_NAME\}\}/g, PLATFORM_NAME);

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

// Wave 13D — emit validation_blocked only after the user has been stuck on
// an invalid step long enough that it's signal, not noise.
const VALIDATION_STUCK_THRESHOLD_MS = 8_000;

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
  // Wave 13G.G — migrated reviewers fast-track to summary if backfill is complete.
  const reviewMode = params.get("reviewMode") === "1";

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

  // Resume at draft's current step on first load — or jump to single-step from settings.
  // Wave 13F.B — prefer key-based resume (current_step_key) so registry reorders
  // don't strand returning users on the wrong screen. Fall back to numeric
  // current_step for orgs whose drafts predate the column.
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

    // Wave 13G.G — reviewMode fast-track: if the migrated draft has every
    // required step populated, skip the step sequence and land on summary.
    // If anything required is missing, fall through to normal resume so the
    // operator isn't dumped into a dead-end summary screen.
    if (reviewMode) {
      const draftStepDataLocal = (draft.step_data ?? {}) as Record<string, Record<string, unknown>>;
      const isPopulated = (val: unknown) => {
        if (!val || typeof val !== "object") return false;
        const obj = val as Record<string, unknown>;
        if (obj.__skipped__ === true) return false;
        if (obj.backfilled === true) return true;
        if (obj.__touched !== true) return false;
        return Object.keys(obj).filter(
          (k) => k !== "backfilled" && k !== "__skipped__" && k !== "__touched",
        ).length > 0;
      };
      const requiredSteps = renderableSteps.filter((s) => s.required);
      const allPopulated =
        requiredSteps.length > 0 &&
        requiredSteps.every((s) => isPopulated(draftStepDataLocal[s.key]));
      if (allPopulated) {
        setShowIntro(false);
        setPhase("summary");
        return;
      }
      // Otherwise: fall through to normal first-incomplete resume below.
    }

    // Key-based resume (preferred)
    const resumeKey = (draft as any).current_step_key as string | null | undefined;
    if (resumeKey) {
      const idx = renderableSteps.findIndex((s) => s.key === resumeKey);
      if (idx >= 0) {
        setCurrentIndex(idx);
        if (idx > 0) setShowIntro(false);
        return;
      }
    }
    // Index-based resume (legacy fallback). Coerce because legacy values may
    // still be text post-migration on cold caches.
    const raw = (draft as any).current_step;
    const resumeAt = raw === null || raw === undefined || raw === "" ? null : Number(raw);
    if (
      resumeAt !== null &&
      Number.isFinite(resumeAt) &&
      resumeAt >= 0 &&
      resumeAt < renderableSteps.length
    ) {
      setCurrentIndex(resumeAt);
      if (resumeAt > 0) setShowIntro(false);
    }
  }, [draft, renderableSteps, singleStepKey, reviewMode]);

  // ── Wave 13D — dwell-time tracking + validation_blocked ────────────────
  // stepEnterAt is reset every time the user lands on a new step. We feed
  // its delta into the telemetry payload on completed/skipped, and again
  // (capped) into validation_blocked when they sit too long on an invalid
  // form so we can distinguish "thinking" from "blocked."
  const stepEnterAt = useRef<number>(Date.now());
  const validationFiredRef = useRef(false);

  // Telemetry: viewed (and reset dwell timer for the new step)
  useEffect(() => {
    if (!orgId || !currentStep || showIntro || phase !== "steps") return;
    stepEnterAt.current = Date.now();
    validationFiredRef.current = false;
    telemetry.mutate({
      organization_id: orgId,
      step_number: currentStep.step_order,
      event: "viewed",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentStep?.key, showIntro, phase]);

  // Telemetry: validation_blocked when the user has been stuck on an
  // invalid step for >8s. Single-fire per step entry to avoid noise.
  useEffect(() => {
    if (!orgId || !currentStep || showIntro || phase !== "steps") return;
    if (stepValid || validationFiredRef.current) return;
    const handle = window.setTimeout(() => {
      if (validationFiredRef.current) return;
      validationFiredRef.current = true;
      telemetry.mutate({
        organization_id: orgId,
        step_number: currentStep.step_order,
        event: "validation_blocked",
        dwell_ms: Date.now() - stepEnterAt.current,
        metadata: { step_key: currentStep.key },
      });
    }, VALIDATION_STUCK_THRESHOLD_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentStep?.key, showIntro, phase, stepValid]);

  const conflicts = useMemo(() => {
    if (!rules.length) return [];
    return detectConflicts(rules, draftStepData);
  }, [rules, draftStepData]);

  // Wave 13D.G1 — onChange snapshots are stored in a ref. We also keep a
  // setter that flushes synchronously on Next so a fast click doesn't drop
  // the latest payload between effect tick and persist.
  // Wave 13G.C — track per-step "touched" so SetupSummary can distinguish
  // user input from default-on-mount payloads.
  const touchedKeysRef = useRef<Set<string>>(new Set());
  const handleStepChange = useCallback((data: Record<string, unknown>) => {
    stepDataRef.current = data;
  }, []);

  const persist = async (advance: 1 | -1 | 0, opts?: { skipping?: boolean }) => {
    if (!orgId || !currentStep) return;
    const isLast = currentIndex === renderableSteps.length - 1;
    const nextIndex = Math.max(0, Math.min(renderableSteps.length - 1, currentIndex + advance));
    const skipping = opts?.skipping ?? false;
    try {
      // Wave 13D.G2 — when soft-skipping, advance current_step in the draft
      // even though stepDataRef is empty, so resume doesn't bounce back.
      const hasPayload = Object.keys(stepDataRef.current).length > 0;
      const nextStepKey = renderableSteps[nextIndex]?.key;
      if (advance >= 0 && (hasPayload || skipping)) {
        // Wave 13G.C — stamp __touched once the user advances past a step.
        if (advance === 1 && hasPayload && !skipping) {
          touchedKeysRef.current.add(currentStep.key);
        }
        const payload = hasPayload
          ? { ...stepDataRef.current, __touched: touchedKeysRef.current.has(currentStep.key) }
          : { __skipped__: true };
        await save.mutateAsync({
          stepKey: currentStep.key,
          data: payload,
          currentStep: nextIndex,
          currentStepKey: nextStepKey,
        });
      }
      if (advance === 1) {
        // Wave 13D.G3 — emit off_ramp when the user self-disqualifies on
        // the fit check so platform ops see the early bail clearly.
        const payload = stepDataRef.current as Record<string, unknown>;
        const isOffRamp =
          currentStep.key === "step_0_fit_check" &&
          (payload as any)?.fit_choice === "not_a_salon";
        const event: StepEvent = isOffRamp
          ? "off_ramp"
          : skipping
            ? "skipped"
            : "completed";
        telemetry.mutate({
          organization_id: orgId,
          step_number: currentStep.step_order,
          event,
          dwell_ms: Date.now() - stepEnterAt.current,
          metadata: isOffRamp ? { reason: "not_a_salon" } : undefined,
        });
      }
      // Single-step re-entry: commit just this step and bounce back to settings.
      // Wave 13G.B — actually invoke the orchestrator (was draft-only before),
      // scoped to the single step so DB columns get the new value.
      if (advance === 1 && singleStepKey) {
        try {
          await commit.mutateAsync({
            organization_id: orgId,
            step_keys: [currentStep.key],
          });
        } catch (err) {
          console.error("[OrganizationSetup] scoped commit failed:", err);
          toast.error("Saved your draft, but couldn't apply the change. Try again from settings.");
          return;
        }
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
    await persist(1, { skipping: true });
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
    if (commit.isPending) return; // Wave 13D.G10 — defensive double-click guard
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

  const handleIntroTelemetry = useCallback(
    (event: "intro_viewed" | "intro_began", dwell_ms?: number) => {
      if (!orgId) return;
      telemetry.mutate({
        organization_id: orgId,
        step_number: 0,
        event,
        dwell_ms,
      });
    },
    [orgId, telemetry],
  );

  // Loading and gating
  if (authLoading) return <BootLuxeLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!orgId) return <Navigate to="/dashboard" replace />;
  if (registryLoading || draftLoading) return <BootLuxeLoader fullScreen />;

  if (showIntro && phase === "steps") {
    return (
      <OnboardingIntroScreen
        onBegin={() => setShowIntro(false)}
        onTelemetry={handleIntroTelemetry}
      />
    );
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

  const whyEntry = WHY_WE_ASK[currentStep.key];
  return (
    <>
      <Helmet>
        <title>{tokenize(currentStep.title)} — {PLATFORM_NAME} setup</title>
      </Helmet>
      <StepShell
        orgId={orgId}
        step={currentStep}
        steps={renderableSteps}
        completedKeys={completedKeys}
        whyWeAsk={tokenize(whyEntry?.reason ?? "")}
        activates={whyEntry?.activates ? tokenize(whyEntry.activates) : undefined}
        activatesHint={whyEntry?.activatesHint}
        canAdvance={stepValid && !blockingConflict}
        saving={save.isPending}
        isFirst={singleStepKey ? false : currentIndex === 0}
        isLast={singleStepKey ? false : currentIndex === renderableSteps.length - 1}
        singleStep={!!singleStepKey}
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
