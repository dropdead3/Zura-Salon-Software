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
    }) => {
      if (!user?.id || !orgId) throw new Error("Not ready");
      const existing = (query.data?.step_data as Record<string, unknown> | null) ?? {};
      const merged = { ...existing, [params.stepKey]: params.data };
      const { error } = await supabase
        .from("org_setup_drafts" as any)
        .upsert({
          user_id: user.id,
          organization_id: orgId,
          step_data: merged,
          current_step: params.currentStep ?? null,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "user_id,organization_id" });
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
