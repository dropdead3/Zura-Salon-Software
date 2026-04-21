import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * useOrgSetupDraft — read/write the in-progress wizard draft.
 *
 * Draft is keyed by (user_id, org_id). Persists across sessions for the
 * same user finishing setup.
 */
export function useOrgSetupDraft(orgId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["org-setup-draft", user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return null;
      const { data, error } = await supabase
        .from("org_setup_drafts" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: async (params: {
      stepKey: string;
      data: Record<string, unknown>;
      currentStep?: number;
      /** Wave 13F.B — registry key of the next step. Survives reordering. */
      currentStepKey?: string;
    }) => {
      if (!user?.id || !orgId) throw new Error("Not ready");
      const existing = (query.data?.step_data as Record<string, unknown> | null) ?? {};
      const merged = { ...existing, [params.stepKey]: params.data };
      // Wave 13D.G7 — never overwrite a previously valid current_step with null.
      // Only include current_step when caller passed an integer.
      const upsertRow: Record<string, unknown> = {
        user_id: user.id,
        organization_id: orgId,
        step_data: merged,
        updated_at: new Date().toISOString(),
      };
      if (typeof params.currentStep === "number" && Number.isFinite(params.currentStep)) {
        upsertRow.current_step = params.currentStep;
      }
      // Wave 13F.B — persist key alongside index so registry reorders don't
      // strand returning users on the wrong step.
      if (typeof params.currentStepKey === "string" && params.currentStepKey.length > 0) {
        upsertRow.current_step_key = params.currentStepKey;
      }
      const { error } = await supabase
        .from("org_setup_drafts" as any)
        .upsert(upsertRow as any, { onConflict: "user_id,organization_id" });
      if (error) throw error;
      return merged;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-setup-draft", user?.id, orgId],
      });
    },
  });

  return { ...query, save };
}
