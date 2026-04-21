import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wave 13F.D — useOrgSetupFunnelHealth
 *
 * Reads the `org_setup_funnel_health` view (per-step aggregates) and applies
 * materiality thresholds so the platform admin sees only signal:
 *
 *   - drop_off_rate    = 1 - (completed / viewed)
 *   - off_ramp_rate    = off_ramp / viewed   (Step 0 only — fit check)
 *   - blocked_rate     = validation_blocked / viewed
 *   - blocked_severity = "alert" when blocked_rate >= BLOCKED_ALERT_RATE
 *                        AND viewed_count >= MIN_SAMPLE
 *
 * Below MIN_SAMPLE the row is returned but flagged `material: false` so the
 * UI can dim it — alert-fatigue doctrine: silence is valid output.
 */
const MIN_SAMPLE = 5;
const BLOCKED_ALERT_RATE = 0.25; // 1 in 4 sessions blocked >8s on the step
const DROP_OFF_ALERT_RATE = 0.4; // 40% of viewers never complete

export interface FunnelHealthRow {
  step_key: string;
  step_number: number;
  viewed_count: number;
  completed_count: number;
  skipped_count: number;
  off_ramp_count: number;
  validation_blocked_count: number;
  unique_orgs_viewed: number;
  unique_orgs_completed: number;
  median_completion_dwell_ms: number | null;
  last_event_at: string | null;
  // Derived
  drop_off_rate: number;
  off_ramp_rate: number;
  blocked_rate: number;
  material: boolean;
  blocked_severity: "alert" | "watch" | "ok";
  drop_off_severity: "alert" | "watch" | "ok";
}

export function useOrgSetupFunnelHealth() {
  return useQuery({
    queryKey: ["org-setup-funnel-health"],
    queryFn: async (): Promise<FunnelHealthRow[]> => {
      const { data, error } = await (supabase as any)
        .from("org_setup_funnel_health")
        .select("*")
        .order("step_number", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((r: any): FunnelHealthRow => {
        const viewed = Number(r.viewed_count ?? 0);
        const completed = Number(r.completed_count ?? 0);
        const offRamp = Number(r.off_ramp_count ?? 0);
        const blocked = Number(r.validation_blocked_count ?? 0);
        const drop_off_rate = viewed > 0 ? 1 - completed / viewed : 0;
        const off_ramp_rate = viewed > 0 ? offRamp / viewed : 0;
        const blocked_rate = viewed > 0 ? blocked / viewed : 0;
        const material = viewed >= MIN_SAMPLE;
        const blocked_severity: FunnelHealthRow["blocked_severity"] =
          !material ? "ok"
          : blocked_rate >= BLOCKED_ALERT_RATE ? "alert"
          : blocked_rate >= BLOCKED_ALERT_RATE / 2 ? "watch"
          : "ok";
        const drop_off_severity: FunnelHealthRow["drop_off_severity"] =
          !material ? "ok"
          : drop_off_rate >= DROP_OFF_ALERT_RATE ? "alert"
          : drop_off_rate >= DROP_OFF_ALERT_RATE / 2 ? "watch"
          : "ok";
        return {
          step_key: r.step_key,
          step_number: Number(r.step_number ?? 0),
          viewed_count: viewed,
          completed_count: completed,
          skipped_count: Number(r.skipped_count ?? 0),
          off_ramp_count: offRamp,
          validation_blocked_count: blocked,
          unique_orgs_viewed: Number(r.unique_orgs_viewed ?? 0),
          unique_orgs_completed: Number(r.unique_orgs_completed ?? 0),
          median_completion_dwell_ms:
            r.median_completion_dwell_ms !== null
              ? Number(r.median_completion_dwell_ms)
              : null,
          last_event_at: r.last_event_at ?? null,
          drop_off_rate,
          off_ramp_rate,
          blocked_rate,
          material,
          blocked_severity,
          drop_off_severity,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
