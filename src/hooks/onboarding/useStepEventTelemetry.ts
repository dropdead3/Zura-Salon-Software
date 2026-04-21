import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StepEvent =
  | "viewed"
  | "started"
  | "completed"
  | "skipped"
  | "paused"
  | "resumed"
  | "conflict_surfaced"
  | "conflict_acknowledged"
  | "other_selected";

const STEP_KEY_BY_NUMBER: Record<number, string> = {
  0: "step_0_fit_check",
  1: "step_1_identity",
  2: "step_2_footprint",
  3: "step_3_team",
  4: "step_4_compensation",
  5: "step_5_catalog",
  6: "step_6_standards",
  7: "step_7_intent",
  8: "step_7_5_apps",
};

/**
 * useStepEventTelemetry — fire-and-forget recording of wizard step events.
 * Drives the platform funnel dashboard. Writes to org_setup_step_events
 * using the canonical column names (organization_id, step_key, occurred_at).
 */
export function useStepEventTelemetry() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      step_number: number;
      event: StepEvent;
      metadata?: Record<string, unknown>;
    }) => {
      const stepKey =
        STEP_KEY_BY_NUMBER[params.step_number] ?? `step_${params.step_number}`;
      const { error } = await supabase.from("org_setup_step_events").insert({
        organization_id: params.organization_id,
        user_id: user?.id ?? null,
        step_key: stepKey,
        step_number: params.step_number,
        event: params.event,
        metadata: params.metadata ?? {},
      });
      if (error) {
        console.warn("[useStepEventTelemetry] insert failed:", error);
      }
    },
  });
}
