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

  return (
    <div className="mb-4 rounded-xl border border-border bg-card/80 backdrop-blur-xl p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-sm tracking-wide uppercase text-foreground">
              Finish your operator profile
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
            Recommendations stay generic until we know your structure — team,
            compensation, and what you're optimizing for. Takes about 6 minutes
            and you can pause anytime.
          </p>
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleStart}
              className="gap-2"
            >
              Continue setup
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
