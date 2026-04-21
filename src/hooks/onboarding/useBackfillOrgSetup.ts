import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * useBackfillOrgSetup — silent hybrid backfill for legacy orgs.
 * Infers structural setup from existing tables, leaves intent + apps pending.
 */
export function useBackfillOrgSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "backfill-org-setup",
        { body: params },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        success: boolean;
        backfilled: number;
        pending: number;
        skipped: number;
        results: Array<{
          step_key: string;
          system: string;
          status: "backfilled" | "skipped" | "pending_intent";
          reason?: string;
        }>;
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["org-setup-commit-log", variables.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["org-setup-draft"],
      });
      if (data.pending > 0) {
        toast.info(
          `${data.backfilled} systems pre-filled — ${data.pending} need your input`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error("Backfill failed: " + err.message);
    },
  });
}
