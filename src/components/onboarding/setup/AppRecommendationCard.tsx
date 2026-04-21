import { Check, Lock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AppTier = "tier_1" | "tier_2" | "tier_3";

interface AppRecommendationCardProps {
  appKey: string;
  name: string;
  description: string;
  /** Why this was recommended */
  rationale: string;
  tier: AppTier;
  selected: boolean;
  onToggle: () => void;
  onLearnMore?: () => void;
}

const TIER_META = {
  tier_1: {
    label: "Operationally required",
    badge: "Required for your setup",
    icon: Lock,
  },
  tier_2: {
    label: "Strongly recommended",
    badge: "Pre-selected — easy to opt out",
    icon: Check,
  },
  tier_3: {
    label: "Worth knowing about",
    badge: "Available — install if interested",
    icon: Info,
  },
} as const;

/**
 * AppRecommendationCard — Tier-aware. Tier 1 is hard-block to uncheck,
 * Tier 2 pre-selected, Tier 3 informational.
 */
export function AppRecommendationCard({
  name,
  description,
  rationale,
  tier,
  selected,
  onToggle,
  onLearnMore,
}: AppRecommendationCardProps) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 p-5",
        selected ? "border-foreground bg-muted/40" : "border-border bg-card",
        tier === "tier_1" && "ring-1 ring-foreground/20",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
              {meta.badge}
            </span>
          </div>
          <div className="font-sans text-base font-medium text-foreground">{name}</div>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          <p className="font-sans text-xs text-foreground/70 leading-relaxed pt-1">
            <span className="font-medium">Why: </span>
            {rationale}
          </p>
          {tier === "tier_3" && onLearnMore && (
            <button
              type="button"
              onClick={onLearnMore}
              className="font-sans text-xs text-foreground hover:underline underline-offset-4 mt-1"
            >
              Tell me more
            </button>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={tier === "tier_1"}
            className={cn(
              "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-transparent",
              tier === "tier_1" && "cursor-not-allowed",
            )}
            aria-label={selected ? "Deselect" : "Select"}
          >
            {selected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
          </button>
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
