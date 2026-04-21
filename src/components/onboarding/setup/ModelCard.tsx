import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  /** Plain-language name (operator-facing) */
  label: string;
  /** Technical/legal name in parens */
  technicalName?: string;
  /** One-line plain-English description */
  description: string;
  /** Bullet examples — surfaced under "Examples" expansion */
  examples?: string[];
  /** "Most operators like you start here" default note */
  defaultNote?: string;
  selected?: boolean;
  onClick?: () => void;
  /** Render as escape valve ("My structure isn't here") */
  escape?: boolean;
}

/**
 * ModelCard — used by Step 4 Compensation to present plan types.
 * Plain-language first; technical name secondary; examples opt-in;
 * defaults stated honestly. Calm aesthetic.
 */
export function ModelCard({
  label,
  technicalName,
  description,
  examples,
  defaultNote,
  selected,
  onClick,
  escape,
}: ModelCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        selected
          ? "border-foreground bg-muted/60"
          : "border-border bg-card hover:border-foreground/40 hover:bg-muted/30",
        escape && "border-dashed",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-5 pt-4 pb-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-sans text-sm font-medium text-foreground">
              {label}
              {technicalName && (
                <span className="font-sans text-xs text-muted-foreground ml-2">
                  ({technicalName})
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </p>
            {defaultNote && !escape && (
              <p className="font-sans text-[11px] text-foreground/70 mt-2 leading-relaxed italic">
                Most operators like you start here · {defaultNote}
              </p>
            )}
          </div>
          <div
            className={cn(
              "shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-all",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-transparent",
            )}
          >
            {selected && <Check className="w-3 h-3" strokeWidth={2.5} />}
          </div>
        </div>
      </button>
      {examples && examples.length > 0 && !escape && (
        <div className="border-t border-border/60">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="w-full px-5 py-2 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
          >
            <span className="font-sans text-[11px] text-muted-foreground uppercase tracking-wider">
              Examples
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          {expanded && (
            <ul className="px-5 pb-3 space-y-1.5">
              {examples.map((ex, i) => (
                <li
                  key={i}
                  className="font-sans text-xs text-muted-foreground leading-relaxed pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-muted-foreground/50"
                >
                  {ex}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
