import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { dismissBackfillBanner } from "@/hooks/onboarding/useBackfillTrigger";

/**
 * useCommitOrgSetup — finalize the wizard.
 * Returns partial-success contract: { success, partial, completed, failed, results }.
 *
 * Wave 11B: on full success, permanently dismiss the BackfillWelcomeBanner
 * for the (user, org) pair so it never reappears after a 24h snooze cycle.
 *
 * Wave 13D.G10 — every commit attempt is tagged with a per-attempt
 * idempotency key. The orchestrator uses (organization_id, idempotency_key,
 * system) as a unique index, so a double-clicked Build button no longer
 * inserts duplicate audit rows or re-runs handlers (locations, app_interest).
 */
export function useCommitOrgSetup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    // mutationKey prevents react-query from running parallel commits even
    // if a stray click slips past the disabled state.
    mutationKey: ["commit-org-setup"],
    mutationFn: async (params: {
      organization_id: string;
      acknowledged_conflicts?: string[];
    }) => {
      // crypto.randomUUID is available in all modern browsers and React Native.
      const idempotency_key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `commit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.functions.invoke(
        "commit-org-setup",
        { body: { ...params, idempotency_key } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        success: boolean;
        partial: boolean;
        completed: number;
        failed: number;
        total: number;
        results: Array<{
          step_key: string;
          system: string;
          status: "completed" | "failed" | "skipped";
          reason?: string;
          deep_link?: string;
        }>;
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", variables.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["org-setup-commit-log", variables.organization_id],
      });
      if (data.success) {
        // Permanently dismiss the welcome banner — work is done.
        if (user?.id) {
          dismissBackfillBanner(user.id, variables.organization_id);
        }
        toast.success("Setup complete");
      } else if (data.partial) {
        toast.warning(
          `${data.completed} of ${data.total} systems configured — finish from settings`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error("Setup commit failed: " + err.message);
    },
  });
}
