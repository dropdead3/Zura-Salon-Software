import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useOrgSetupCommitLog — read the per-system commit history for an org.
 * Drives the "unfinished from setup" callouts on settings pages.
 */
export function useOrgSetupCommitLog(orgId: string | null) {
  return useQuery({
    queryKey: ["org-setup-commit-log", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("org_setup_commit_log" as any)
        .select("*")
        .eq("org_id", orgId)
        .order("attempted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        system: string;
        status: string;
        reason: string | null;
        deep_link: string | null;
        attempted_at: string;
        acknowledged_conflicts: unknown;
      }>;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
