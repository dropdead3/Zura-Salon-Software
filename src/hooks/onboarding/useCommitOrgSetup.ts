import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * useCommitOrgSetup — finalize the wizard.
 * Returns partial-success contract: { success, partial, completed, failed, results }.
 */
export function useCommitOrgSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      acknowledged_conflicts?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "commit-org-setup",
        { body: params },
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
