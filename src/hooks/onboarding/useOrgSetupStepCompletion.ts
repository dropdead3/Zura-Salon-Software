import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StepCompletionRow {
  completed_at: string | null;
  status: string;
  completion_source: string | null;
  /** Derived: count of distinct commit attempts (current row counts as 1; created_at vs updated_at gap implies retries). */
  attempt_count: number;
}

/**
 * useOrgSetupStepCompletion — Wave 13G.E.
 *
 * Reads `org_setup_step_completion` (write-only until now) so the wizard's
 * `SetupProgressPanel` can show "Confirmed Xm ago" under each completed step.
 * Returns a map keyed by `step_key`. Honors visibility-contract: empty map
 * when nothing has been committed yet, never throws on missing rows.
 */
export function useOrgSetupStepCompletion(orgId: string | null) {
  return useQuery({
    queryKey: ["org-setup-step-completion", orgId],
    queryFn: async () => {
      if (!orgId) return {} as Record<string, StepCompletionRow>;
      const { data, error } = await supabase
        .from("org_setup_step_completion")
        .select("step_key, completed_at, status, completion_source, created_at, updated_at")
        .eq("organization_id", orgId);
      if (error) throw error;
      const map: Record<string, StepCompletionRow> = {};
      for (const row of (data ?? []) as Array<{
        step_key: string;
        completed_at: string | null;
        status: string;
        completion_source: string | null;
        created_at: string;
        updated_at: string;
      }>) {
        // Heuristic: if updated_at differs meaningfully from created_at,
        // the operator re-committed at least once. We can't recover an exact
        // count from a single-row upsert, so cap at 2 ("retried").
        const created = new Date(row.created_at).getTime();
        const updated = new Date(row.updated_at).getTime();
        const retried = Number.isFinite(created) && Number.isFinite(updated) && updated - created > 2_000;
        map[row.step_key] = {
          completed_at: row.completed_at,
          status: row.status,
          completion_source: row.completion_source,
          attempt_count: retried ? 2 : 1,
        };
      }
      return map;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

/** Format a completed_at timestamp as a tiny relative string ("3d ago", "5m ago"). */
export function formatRelativeShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
