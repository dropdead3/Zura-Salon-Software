import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DetectedConflict } from "./types";

interface ConflictBannerProps {
  conflict: DetectedConflict;
  onJumpToStep?: (stepKey: string) => void;
  onAcknowledge?: () => void;
  acknowledged?: boolean;
}

const SEVERITY_META = {
  block: {
    icon: AlertCircle,
    label: "Conflict",
    border: "border-foreground/40",
    bg: "bg-foreground/[0.04]",
  },
  warn: {
    icon: AlertTriangle,
    label: "Heads up",
    border: "border-border",
    bg: "bg-muted/40",
  },
  inform: {
    icon: Info,
    label: "Note",
    border: "border-border/60",
    bg: "bg-muted/20",
  },
} as const;

/**
 * ConflictBanner — surfaces a single declarative conflict to the operator.
 * `block` severity disables commit. `warn` and `inform` are advisory.
 * Reuses PolicyConflictBanner aesthetic; calm, architectural, no alarm colors.
 */
export function ConflictBanner({
  conflict,
  onJumpToStep,
  onAcknowledge,
  acknowledged,
}: ConflictBannerProps) {
  const meta = SEVERITY_META[conflict.severity];
  const Icon = meta.icon;
  return (
    <div className={cn("rounded-xl border p-4", meta.border, meta.bg)}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-wider text-foreground">
              {meta.label}
            </span>
            {acknowledged && (
              <span className="font-sans text-[10px] text-muted-foreground">
                · acknowledged
              </span>
            )}
          </div>
          <p className="font-sans text-sm text-foreground leading-relaxed">
            {conflict.explanation}
          </p>
          {conflict.suggested_resolution && (
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              {conflict.suggested_resolution}
            </p>
          )}
          {(conflict.resolution_step || onAcknowledge) && (
            <div className="flex items-center gap-2 pt-1">
              {conflict.resolution_step && onJumpToStep && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onJumpToStep(conflict.resolution_step!)}
                >
                  Jump to step
                </Button>
              )}
              {conflict.severity !== "block" && onAcknowledge && !acknowledged && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onAcknowledge}
                >
                  Acknowledge
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
