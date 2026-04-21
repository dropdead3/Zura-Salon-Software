import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhyWeAskCalloutProps {
  reason: string;
  unlocks?: string;
  /** Wave 13G.E — apps automatically activated by this step (e.g. "Zura Color Bar"). */
  activates?: string;
  /** Optional extra context for the activation line. */
  activatesHint?: string;
}

/**
 * WhyWeAskCallout — collapsible disclosure explaining why a step matters.
 * Subtle, calm. Closed by default.
 */
export function WhyWeAskCallout({ reason, unlocks, activates, activatesHint }: WhyWeAskCalloutProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-sans text-xs text-muted-foreground">
            Why we're asking
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          <p className="font-sans text-xs text-foreground leading-relaxed">{reason}</p>
          {unlocks && (
            <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">This unlocks: </span>
              {unlocks}
            </p>
          )}
          {activates && (
            <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Activates: </span>
              {activates}
              {activatesHint && (
                <span className="italic text-muted-foreground/80"> ({activatesHint})</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
