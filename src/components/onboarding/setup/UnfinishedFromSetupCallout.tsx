import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgSetupCommitLog } from "@/hooks/onboarding/useOrgSetupCommitLog";
import { useOrgDashboardPath } from "@/hooks/useOrgDashboardPath";
import { cn } from "@/lib/utils";

interface UnfinishedFromSetupCalloutProps {
  orgId: string;
  /** Optional: filter to only these systems (e.g. ["compensation"] on the payroll page) */
  systems?: string[];
  /** Map of system -> wizard step key for re-entry */
  stepKeyMap?: Record<string, string>;
  className?: string;
}

const DEFAULT_STEP_MAP: Record<string, string> = {
  identity: "step_1_identity",
  footprint: "step_2_footprint",
  team: "step_3_team",
  compensation: "step_4_compensation",
  catalog: "step_5_catalog",
  standards: "step_6_standards",
  intent: "step_7_intent",
  apps: "step_7_5_apps",
};

/**
 * UnfinishedFromSetupCallout — surfaces failed/skipped systems from the
 * commit log on the relevant settings page. CTA either deep-links to the
 * settings detail or relaunches the wizard at the single step.
 *
 * Quiet by design: returns null if there's nothing to surface so it never
 * adds noise to clean accounts.
 */
export function UnfinishedFromSetupCallout({
  orgId,
  systems,
  stepKeyMap = DEFAULT_STEP_MAP,
  className,
}: UnfinishedFromSetupCalloutProps) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { data: log = [] } = useOrgSetupCommitLog(orgId);

  // Latest entry per system wins
  const unfinished = useMemo(() => {
    const latestPerSystem = new Map<string, (typeof log)[number]>();
    for (const row of log) {
      if (!latestPerSystem.has(row.system)) {
        latestPerSystem.set(row.system, row);
      }
    }
    return Array.from(latestPerSystem.values()).filter((r) => {
      if (r.status !== "failed" && r.status !== "skipped") return false;
      if (systems && !systems.includes(r.system)) return false;
      return true;
    });
  }, [log, systems]);

  if (unfinished.length === 0) return null;

  const handleFinish = (row: (typeof unfinished)[number]) => {
    // Routing doctrine: client-side navigation only. Absolute external URLs
    // (https://...) are allowed via window.open in a new tab so we never
    // hard-reload the SPA and drop multi-tenant slug context.
    if (row.deep_link) {
      const isAbsolute = /^https?:\/\//i.test(row.deep_link);
      if (isAbsolute) {
        window.open(row.deep_link, "_blank", "noopener,noreferrer");
        return;
      }
      // Strip /dashboard prefix if present so dashPath() can re-scope by slug
      const subpath = row.deep_link.replace(/^\/dashboard/, "");
      navigate(dashPath(subpath));
      return;
    }
    const stepKey = stepKeyMap[row.system];
    if (stepKey) {
      navigate(
        `/onboarding/setup?org=${orgId}&step=${stepKey}&skipIntro=1&returnTo=${encodeURIComponent(
          window.location.pathname,
        )}`,
      );
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/20 p-5 space-y-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Unfinished from setup
          </div>
          <h3 className="font-display text-sm tracking-wide font-medium mt-1">
            {unfinished.length === 1
              ? "One system still needs your attention"
              : `${unfinished.length} systems still need your attention`}
          </h3>
        </div>
      </div>

      <div className="space-y-2 pl-10">
        {unfinished.map((row) => (
          <div
            key={row.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-4 py-3"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <X className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-sans text-sm font-medium text-foreground capitalize">
                  {row.system.replace(/_/g, " ")}
                </div>
                {row.reason && (
                  <p className="font-sans text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {row.reason}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleFinish(row)}
              className="gap-1.5 shrink-0"
            >
              Finish
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
