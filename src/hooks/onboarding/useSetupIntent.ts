import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

/**
 * useSetupIntent — Wave 13E.
 *
 * Reads `organizations.setup_intent` (the multi-select from Step 7 of the
 * setup wizard) and exposes a ranked persona vector that downstream
 * surfaces (sidebar, recommendation engine, dashboard widget order) can
 * consume to prioritize what the operator sees first.
 *
 * Doctrine: persona scaling is structural, not decorative — surfaces must
 * scale to operator focus instead of dumping every feature on every user.
 */

export type IntentKey =
  | "protect_margin"
  | "scale_locations"
  | "grow_team"
  | "increase_retention"
  | "reduce_chaos"
  | "pay_correctly"
  | "marketing_lift"
  | "compliance";

/** Maps intents → the dashboard surface keys they prioritize. */
export const INTENT_TO_SURFACE_WEIGHTS: Record<IntentKey, Record<string, number>> = {
  protect_margin: {
    sales_analytics: 10,
    forecasting: 8,
    payroll: 6,
    commission_drift: 9,
  },
  scale_locations: {
    location_comparison: 10,
    sales_analytics: 7,
    operations: 6,
  },
  grow_team: {
    coaching: 10,
    career_pathway: 9,
    leaderboard: 7,
    one_on_ones: 8,
  },
  increase_retention: {
    client_health: 10,
    retention_tasks: 9,
    rebook_intelligence: 8,
  },
  reduce_chaos: {
    daily_briefing: 10,
    todays_prep: 9,
    tasks: 8,
  },
  pay_correctly: {
    payroll: 10,
    tip_distribution: 9,
    commission_drift: 8,
  },
  marketing_lift: {
    marketing_analytics: 10,
    campaigns: 9,
    seo_workshop: 8,
  },
  compliance: {
    policies: 10,
    payroll: 6,
    handbook: 8,
  },
};

interface UseSetupIntentResult {
  /** Raw intent keys the operator selected, in selection order. */
  intents: IntentKey[];
  /** True if intent has been explicitly set; false → fall back to defaults. */
  hasIntent: boolean;
  isLoading: boolean;
  /**
   * Score a surface key by summing the weights from each active intent.
   * Higher score = render earlier / more prominently.
   */
  scoreSurface: (surfaceKey: string) => number;
}

export function useSetupIntent(): UseSetupIntentResult {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["org-setup-intent", orgId],
    queryFn: async () => {
      if (!orgId) return [] as IntentKey[];
      const { data, error } = await supabase
        .from("organizations")
        .select("setup_intent")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      const raw = (data?.setup_intent ?? []) as string[];
      return raw.filter((k): k is IntentKey => k in INTENT_TO_SURFACE_WEIGHTS);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  const intents = data ?? [];
  const hasIntent = intents.length > 0;

  const scoreSurface = (surfaceKey: string): number => {
    if (!hasIntent) return 0;
    return intents.reduce((acc, intent) => {
      return acc + (INTENT_TO_SURFACE_WEIGHTS[intent]?.[surfaceKey] ?? 0);
    }, 0);
  };

  return { intents, hasIntent, isLoading, scoreSurface };
}
