import { useEffect, useMemo, useState } from "react";
import { AppRecommendationCard, type AppTier } from "./AppRecommendationCard";
import type { StepProps } from "./types";

interface Step7_5Data {
  installed_apps: string[];
  expressed_interest: string[];
}

interface AppRec {
  key: string;
  name: string;
  description: string;
  tier: AppTier;
  rationale: string;
}

/**
 * Tier classifier — reads draftData and produces a ranked list. Three confidence tiers.
 *  Tier 1: hard requirement based on what they declared.
 *  Tier 2: strongly recommended, pre-selected.
 *  Tier 3: opportunistic, unchecked.
 */
function classifyApps(draftData: Record<string, any>): AppRec[] {
  const team = draftData.step_3_team ?? {};
  const comp = draftData.step_4_compensation ?? {};
  const cat = draftData.step_5_catalog ?? {};
  const intent = (draftData.step_7_intent?.intent ?? []) as string[];
  const footprint = draftData.step_2_footprint ?? {};
  const models: string[] = comp.models ?? [];
  const categories: string[] = cat.service_categories ?? [];
  const out: AppRec[] = [];

  // Tier 1 — operationally required
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

  // Tier 2 — strongly recommended
  if (intent.includes("grow_team") || team.team_size_band !== "solo") {
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

  // Tier 3 — informational
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

  const initialInstalled = useMemo(() => {
    if (initialData?.installed_apps) return initialData.installed_apps;
    // Default: Tier 1 + Tier 2 pre-selected
    return apps.filter((a) => a.tier !== "tier_3").map((a) => a.key);
  }, [initialData, apps]);

  const [installed, setInstalled] = useState<string[]>(initialInstalled);
  const [interest, setInterest] = useState<string[]>(initialData?.expressed_interest ?? []);

  useEffect(() => {
    onChange({ installed_apps: installed, expressed_interest: interest });
    onValidityChange(true);
  }, [installed, interest, onChange, onValidityChange]);

  const toggle = (key: string, tier: AppTier) => {
    if (tier === "tier_1") return; // Hard-block
    setInstalled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
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
        Based on what you've told us. Required apps are locked in. Pre-selected
        apps are easy to opt out of. Informational ones you can install later.
      </p>

      <div className="space-y-3">
        {apps.map((app) => (
          <AppRecommendationCard
            key={app.key}
            appKey={app.key}
            name={app.name}
            description={app.description}
            rationale={app.rationale}
            tier={app.tier}
            selected={installed.includes(app.key)}
            onToggle={() => toggle(app.key, app.tier)}
            onLearnMore={app.tier === "tier_3" ? () => expressInterest(app.key) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
