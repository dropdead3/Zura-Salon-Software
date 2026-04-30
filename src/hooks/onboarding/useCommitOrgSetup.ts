import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { dismissBackfillBanner } from "@/hooks/onboarding/useBackfillTrigger";
import { writeSiteSettingDraft } from "@/lib/siteSettingsDraft";
import type { ColorTheme } from "@/hooks/useColorTheme";

// Same key + valid set as useWebsiteColorTheme. Inlined here to avoid pulling
// the whole hook tree into the wizard commit path.
const WEBSITE_THEME_SETTING_KEY = "website_active_color_theme";
const VALID_THEMES: ReadonlySet<ColorTheme> = new Set([
  "zura", "cream-lux", "neon", "rosewood", "orchid", "peach",
  "cognac", "jade", "sage", "matrix", "noir", "marine",
]);

/**
 * Seed the new org's public-site theme to match the dashboard theme the
 * operator was using during onboarding. Without this, every new org lands
 * on the cream-lux default — even when the operator clearly chose Neon /
 * Marine / etc. for their dashboard, creating jarring visual whiplash on
 * first preview of the public site.
 *
 * Best-effort: any failure is swallowed (the org is already created; this is
 * cosmetic) and never blocks the commit success path.
 */
async function seedWebsiteThemeFromDashboard(orgId: string, userId: string | null) {
  try {
    if (typeof window === "undefined") return;
    // Prefer the org-scoped key if the operator already touched the dashboard
    // theme picker for this org during onboarding; fall back to the global
    // legacy key (the early-paint hint used before orgId resolves).
    const orgKey = `dd-color-theme:${orgId}`;
    const raw =
      window.localStorage.getItem(orgKey) ??
      window.localStorage.getItem("dd-color-theme");
    if (!raw || !VALID_THEMES.has(raw as ColorTheme)) return;
    await writeSiteSettingDraft(orgId, WEBSITE_THEME_SETTING_KEY, { theme: raw }, userId);
  } catch {
    // Non-fatal — operator can re-pick from Site Design.
  }
}


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
      /** Wave 13G.B — when set, the orchestrator runs ONLY these step keys. */
      step_keys?: string[];
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
        // Seed the public-site theme to match the dashboard theme so the
        // operator's first preview of their public site doesn't whiplash
        // back to cream-lux. Best-effort; non-blocking.
        void seedWebsiteThemeFromDashboard(
          variables.organization_id,
          user?.id ?? null,
        );
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
