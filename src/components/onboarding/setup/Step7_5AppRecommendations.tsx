import { useEffect, useMemo, useState } from "react";
import { AppRecommendationCard, type AppTier } from "./AppRecommendationCard";
import type { StepProps } from "./types";

interface Step7_5Data {
  installed_apps: string[];
  expressed_interest: string[];
  /** Wave 13G.F — Tier-1 declines (autonomy doctrine). */
  declined_apps: string[];
  /** Wave 13G.A — current classifier output, used by orchestrator to drop stale installs. */
  qualified_keys: string[];
}

interface AppRec {
  key: string;
  name: string;
  description: string;
  tier: AppTier;
  rationale: string;
}

function classifyApps(draftData: Record<string, any>): AppRec[] {
  const team = draftData.step_3_team ?? {};
  const comp = draftData.step_4_compensation ?? {};
  const cat = draftData.step_5_catalog ?? {};
  const intent = (draftData.step_7_intent?.intent ?? []) as string[];
  const footprint = draftData.step_2_footprint ?? {};
  const models: string[] = comp.models ?? [];
  const categories: string[] = cat.service_categories ?? [];
  const out: AppRec[] = [];

  if (models.length > 0 && !models.includes("booth_rental")) {
    out.push({
      key: "zura_payroll",
      name: "Zura Payroll",
      description: "Commission calculation, tip distribution, payroll runs, and pay statements.",
      tier: "tier_1",
      rationale: "You declared compensation models that require automated payroll calculation.",
    });
  }
  if (categories.includes("color") || categories.includes("chemical")) {
    out.push({
      key: "color_bar",
      name: "Zura Color Bar",
      description: "Chemical service formulas, mixing intelligence, and per-location color inventory tracking.",
      tier: "tier_1",
      rationale: "You offer color and/or chemical services. Color Bar tracks formulas and protects margin on chemical work.",
    });
  }
  if (intent.includes("grow_team") || (team.team_size_band && team.team_size_band !== "1-3")) {
    out.push({
      key: "zura_connect",
      name: "Zura Connect",
      description: "Team chat, shift announcements, and operational communication.",
      tier: "tier_2",
      rationale: "You're managing a team. Connect replaces group texts and Slack with role-aware operational chat.",
    });
  }
  if (intent.includes("increase_retention") || intent.includes("marketing_lift")) {
    out.push({
      key: "marketing_os",
      name: "Zura Marketing OS",
      description: "Reactivation campaigns, paid social orchestration, and closed-loop attribution.",
      tier: "tier_2",
      rationale: "You want to drive retention and acquisition. Marketing OS handles campaign creation, ship, and attribution.",
    });
  }
  if (footprint.location_count > 1 || intent.includes("scale_locations")) {
    out.push({
      key: "multi_location_intelligence",
      name: "Multi-Location Intelligence",
      description: "Cross-location benchmarking, drift detection, and standardized enforcement.",
      tier: "tier_2",
      rationale: "You operate (or plan to operate) more than one location. This unlocks comparative analytics.",
    });
  }
  if (intent.includes("protect_margin")) {
    out.push({
      key: "capital",
      name: "Zura Capital",
      description: "Working capital advances against future revenue with deterministic underwriting.",
      tier: "tier_3",
      rationale: "Operators focused on margin often expand capacity through Capital — worth knowing about.",
    });
  }
  if (cat.sells_retail) {
    out.push({
      key: "drop_dead_supply",
      name: "Drop Dead Supply",
      description: "Vertically-integrated retail product replenishment and inventory automation.",
      tier: "tier_3",
      rationale: "You sell retail. Drop Dead embeds professional product supply into your back-of-house workflow.",
    });
  }

  return out;
}

export function Step7_5AppRecommendations({
  initialData,
  draftData,
  onChange,
  onValidityChange,
}: StepProps<Step7_5Data>) {
  const apps = useMemo(() => classifyApps(draftData), [draftData]);
  const qualifiedKeys = useMemo(() => apps.map((a) => a.key), [apps]);

  // Wave 13G.A — intersect saved installs with currently-qualified keys so
  // a previously-Tier-1 app doesn't stay pre-selected after the operator
  // edits Step 5 to drop chemical services.
  const initialInstalled = useMemo(() => {
    const qualifiedSet = new Set(qualifiedKeys);
    if (initialData?.installed_apps) {
      return initialData.installed_apps.filter((k) => qualifiedSet.has(k));
    }
    return apps.filter((a) => a.tier !== "tier_3").map((a) => a.key);
  }, [initialData, apps, qualifiedKeys]);

  const [installed, setInstalled] = useState<string[]>(initialInstalled);
  const [interest, setInterest] = useState<string[]>(initialData?.expressed_interest ?? []);
  const [declined, setDeclined] = useState<string[]>(initialData?.declined_apps ?? []);

  useEffect(() => {
    onChange({
      installed_apps: installed,
      expressed_interest: interest,
      declined_apps: declined,
      qualified_keys: qualifiedKeys,
    });
    onValidityChange(true);
  }, [installed, interest, declined, qualifiedKeys, onChange, onValidityChange]);

  const toggle = (key: string, tier: AppTier) => {
    // Wave 13G.F — Tier-1 toggle is now allowed via the explicit "decline" path.
    // We keep this generic toggle for Tier 2/3 only.
    if (tier === "tier_1") return;
    setDeclined((prev) => prev.filter((k) => k !== key));
    setInstalled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const declineTier1 = (key: string) => {
    setInstalled((prev) => prev.filter((k) => k !== key));
    setDeclined((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const reactivateTier1 = (key: string) => {
    setDeclined((prev) => prev.filter((k) => k !== key));
    setInstalled((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const expressInterest = (key: string) => {
    setInterest((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  if (apps.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-8 text-center">
        <p className="font-sans text-sm text-muted-foreground">
          No app recommendations triggered by your setup. You can browse the
          marketplace anytime from the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
        Based on what you've told us. Recommended apps are pre-selected — you can
        skip any of them. Informational ones are available to install later.
      </p>

      <div className="space-y-3">
        {apps.map((app) => {
          const isDeclined = declined.includes(app.key);
          return (
            <AppRecommendationCard
              key={app.key}
              appKey={app.key}
              name={app.name}
              description={app.description}
              rationale={app.rationale}
              tier={app.tier}
              selected={installed.includes(app.key)}
              declined={isDeclined}
              onToggle={() => toggle(app.key, app.tier)}
              onDecline={app.tier === "tier_1" && !isDeclined ? () => declineTier1(app.key) : undefined}
              onReactivate={app.tier === "tier_1" && isDeclined ? () => reactivateTier1(app.key) : undefined}
              onLearnMore={app.tier === "tier_3" ? () => expressInterest(app.key) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
