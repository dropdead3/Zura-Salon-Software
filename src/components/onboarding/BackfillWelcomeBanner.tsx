import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useOrgSetupCommitLog } from "@/hooks/onboarding/useOrgSetupCommitLog";
import {
  readBackfillBanner,
  dismissBackfillBanner,
  snoozeBackfillBanner,
} from "@/hooks/onboarding/useBackfillTrigger";

const COMPLETION_SYSTEMS = ["intent", "apps"] as const;

/**
 * BackfillWelcomeBanner — one-time, dismissible banner shown after the
 * silent backfill completes. Drives the owner to finish intent + apps.
 *
 * Auto-hide: When the commit log shows BOTH `intent` and `apps` as
 * `completed`, the banner self-dismisses (no manual close required).
 * This keeps the banner from lingering after the operator finishes.
 */
export function BackfillWelcomeBanner() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<{
    backfilled: number;
    pending: number;
  } | null>(null);

  const { data: log = [] } = useOrgSetupCommitLog(
    effectiveOrganization?.id ?? null,
  );

  // Auto-dismiss check: latest entry per system; both must be completed.
  const intentAndAppsDone = useMemo(() => {
    const latest = new Map<string, string>();
    for (const row of log) {
      if (!latest.has(row.system)) latest.set(row.system, row.status);
    }
    return COMPLETION_SYSTEMS.every((s) => latest.get(s) === "completed");
  }, [log]);

  useEffect(() => {
    const state = readBackfillBanner(user?.id, effectiveOrganization?.id);
    if (!state || state.shown || !(state.backfilled && state.backfilled > 0)) return;
    // Honor active snooze — banner returns automatically once it expires.
    if (state.snoozedUntil && state.snoozedUntil > Date.now()) return;
    setData({ backfilled: state.backfilled, pending: state.pending ?? 0 });
    setVisible(true);
  }, [user?.id, effectiveOrganization?.id]);

  // Auto-dismiss when both pending steps are completed.
  useEffect(() => {
    if (!visible) return;
    if (!intentAndAppsDone) return;
    if (user?.id && effectiveOrganization?.id) {
      dismissBackfillBanner(user.id, effectiveOrganization.id);
    }
    setVisible(false);
  }, [intentAndAppsDone, visible, user?.id, effectiveOrganization?.id]);

  /** X button — soft snooze (24h) so the user can come back to setup later. */
  const dismiss = () => {
    if (user?.id && effectiveOrganization?.id) {
      snoozeBackfillBanner(user.id, effectiveOrganization.id);
    }
    setVisible(false);
  };

  const handleReview = () => {
    if (!effectiveOrganization?.id) return;
    // Snooze (not permanent dismiss) — if they back out of the wizard,
    // the banner returns on next visit so they can resume.
    if (user?.id) {
      snoozeBackfillBanner(user.id, effectiveOrganization.id);
    }
    setVisible(false);
    navigate(
      `/onboarding/setup?org=${effectiveOrganization.id}&step=step_7_intent&skipIntro=1&returnTo=${encodeURIComponent(
        window.location.pathname,
      )}`,
    );
  };

  if (!visible || !data) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              Welcome back
            </div>
            <h3 className="font-display text-base sm:text-lg tracking-wide font-medium mt-1">
              We pre-filled {data.backfilled} system
              {data.backfilled === 1 ? "" : "s"} from your existing operation.
            </h3>
            <p className="font-sans text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {data.pending > 0
                ? "Spend two minutes telling us what you want from Zura — it sharpens every recommendation."
                : "You're set up. Review when you have a minute."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {data.pending > 0 && (
        <div className="flex justify-end mt-4 pt-4 border-t border-border/60">
          <Button
            type="button"
            size="sm"
            onClick={handleReview}
            className="gap-1.5"
          >
            Take 2 minutes
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
