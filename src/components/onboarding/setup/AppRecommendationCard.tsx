import { Check, Lock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTier = "tier_1" | "tier_2" | "tier_3";

interface AppRecommendationCardProps {
  appKey: string;
  name: string;
  description: string;
  rationale: string;
  tier: AppTier;
  selected: boolean;
  /** Wave 13G.F — Tier-1 has been explicitly declined by the operator. */
  declined?: boolean;
  onToggle: () => void;
  /** Wave 13G.F — Tier-1 only: skip this recommended app. */
  onDecline?: () => void;
  /** Wave 13G.F — Tier-1 only: undo a prior decline. */
  onReactivate?: () => void;
  onLearnMore?: () => void;
}

const TIER_META = {
  tier_1: {
    badge: "Recommended — required for your setup",
    icon: Lock,
  },
  tier_2: {
    badge: "Pre-selected — easy to opt out",
    icon: Check,
  },
  tier_3: {
    badge: "Available — install if interested",
    icon: Info,
  },
} as const;

/**
 * AppRecommendationCard — Tier-aware. Tier 1 defaults on but is now
 * declinable per autonomy doctrine (Wave 13G.F).
 */
export function AppRecommendationCard({
  name,
  description,
  rationale,
  tier,
  selected,
  declined,
  onToggle,
  onDecline,
  onReactivate,
  onLearnMore,
}: AppRecommendationCardProps) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const isTier1 = tier === "tier_1";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 p-5",
        selected ? "border-foreground bg-muted/40" : "border-border bg-card",
        declined && "opacity-60",
        isTier1 && !declined && "ring-1 ring-foreground/20",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
            {declined ? "Skipped" : meta.badge}
          </span>
          <div className="font-sans text-base font-medium text-foreground">{name}</div>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          <p className="font-sans text-xs text-foreground/70 leading-relaxed pt-1">
            <span className="font-medium">Why: </span>
            {rationale}
          </p>
          <div className="flex items-center gap-3 pt-1">
            {tier === "tier_3" && onLearnMore && (
              <button
                type="button"
                onClick={onLearnMore}
                className="font-sans text-xs text-foreground hover:underline underline-offset-4"
              >
                Tell me more
              </button>
            )}
            {isTier1 && onDecline && (
              <button
                type="button"
                onClick={onDecline}
                className="font-sans text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
              >
                Skip anyway
              </button>
            )}
            {isTier1 && onReactivate && (
              <button
                type="button"
                onClick={onReactivate}
                className="font-sans text-xs text-foreground hover:underline underline-offset-4"
              >
                Re-enable
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={isTier1}
            className={cn(
              "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-transparent",
              isTier1 && "cursor-default",
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
