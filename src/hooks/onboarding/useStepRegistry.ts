import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StepRegistryEntry } from "@/components/onboarding/setup/types";

/**
 * useStepRegistry — fetches the active wizard steps from the registry.
 * Excludes deprecated steps. Sorted by step_order ASC.
 */
export function useStepRegistry() {
  return useQuery({
    queryKey: ["setup-step-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setup_step_registry" as any)
        .select("*")
        .is("deprecated_at", null)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StepRegistryEntry[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
