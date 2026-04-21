import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Settings2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useLeadershipCheck } from "@/hooks/useLeadershipCheck";
import { useOrgDashboardPath } from "@/hooks/useOrgDashboardPath";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

/**
 * InitialSetupGateBanner — Wave 13E.
 *
 * Doctrine: "structure precedes intelligence." When an organization has no
 * `setup_completed_at`, the dashboard renders without operator context —
 * intent, identity, and compensation are unknown, so recommendations are
 * unsafe. This banner nudges leadership into the wizard while leaving the
 * dashboard usable (advisory, not blocking — wizard is async).
 *
 * Visibility rules:
 *   - Only leadership roles see it (stylists & front desk are not the audience).
 *   - Hidden once `setup_completed_at` is stamped.
 *   - Dismissible per-session via sessionStorage (not persisted — every
 *     fresh session re-surfaces the nudge until setup actually completes).
 */
export function InitialSetupGateBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveOrganization, isImpersonating } = useOrganizationContext();
  const { isLeadership } = useLeadershipCheck();
  const { dashPath } = useOrgDashboardPath();
  const orgId = effectiveOrganization?.id ?? null;

  const dismissKey = orgId ? `setup-gate-dismissed:${orgId}` : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissKey) return;
    setDismissed(sessionStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  const { data, isLoading } = useQuery({
    queryKey: ["org-setup-status", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("setup_completed_at, signup_source")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && isLeadership && !isImpersonating,
    staleTime: 60_000,
  });

  // Wave 13G.E — for migrated orgs, check if their draft is meaningfully
  // backfilled so we can show "Review what we inferred" instead of the
  // generic "Finish your operator profile" nudge.
  const { data: draft } = useQuery({
    queryKey: ["org-setup-draft-backfill-state", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;
      const { data, error } = await supabase
        .from("org_setup_drafts" as any)
        .select("step_data")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled:
      !!orgId &&
      !!user?.id &&
      isLeadership &&
      !isImpersonating &&
      data?.signup_source === "backfilled",
    staleTime: 60_000,
  });

  if (
    !user ||
    !orgId ||
    !isLeadership ||
    isImpersonating ||
    isLoading ||
    !data ||
    data.setup_completed_at ||
    dismissed
  ) {
    return null;
  }

  const handleDismiss = () => {
    if (dismissKey) sessionStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const handleStart = () => {
    navigate(dashPath("/onboarding/organization-setup"));
  };

  // Migrated cohort with at least one backfilled step → reviewer framing.
  const stepData =
    (draft?.step_data as Record<string, Record<string, unknown>> | null) ?? null;
  const hasBackfilledStep =
    !!stepData &&
    Object.values(stepData).some(
      (s) => s && typeof s === "object" && (s as any).backfilled === true,
    );
  const isMigratedReview =
    data.signup_source === "backfilled" && hasBackfilledStep;

  const headline = isMigratedReview
    ? "Review what we inferred"
    : "Finish your operator profile";
  const description = isMigratedReview
    ? "We pre-filled your structure from existing data. Confirm or adjust the few open items."
    : "Recommendations stay generic until we know your structure — team, compensation, and what you're optimizing for. Takes about 6 minutes and you can pause anytime.";
  const ctaLabel = isMigratedReview ? "Review and confirm" : "Continue setup";

  return (
    <div className="mb-4 rounded-xl border border-border bg-card/80 backdrop-blur-xl p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-sm tracking-wide uppercase text-foreground">
              {headline}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleStart}
              className="gap-2"
            >
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
