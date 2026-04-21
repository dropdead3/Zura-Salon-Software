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

/**
 * useStepEventTelemetry — fire-and-forget recording of wizard step events.
 * Drives the internal funnel dashboard.
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
      const { error } = await supabase.from("org_setup_step_events" as any).insert({
        org_id: params.organization_id,
        user_id: user?.id ?? null,
        step_number: params.step_number,
        event: params.event,
        metadata: params.metadata ?? {},
      } as any);
      if (error) {
        console.warn("[useStepEventTelemetry] insert failed:", error);
      }
    },
  });
}
