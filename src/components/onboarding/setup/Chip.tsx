import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ChipProps {
  label: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Chip — selectable pill used in fit-check, intent, and other multi-pickers.
 * Calm, architectural. Selected state uses border + subtle bg, not heavy fill.
 */
export function Chip({ label, description, selected, onClick, disabled }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative w-full text-left rounded-xl border px-5 py-4 transition-all duration-200",
        "hover:border-foreground/40 hover:bg-muted/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        selected
          ? "border-foreground bg-muted/60"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-sans text-sm font-medium text-foreground">{label}</div>
          {description && (
            <div className="font-sans text-xs text-muted-foreground mt-1 leading-relaxed">
              {description}
            </div>
          )}
        </div>
        <div
          className={cn(
            "shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all",
            selected
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-transparent",
          )}
        >
          {selected && <Check className="w-3 h-3" strokeWidth={2.5} />}
        </div>
      </div>
    </button>
  );
}
