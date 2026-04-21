import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  className,
}: NumberStepperProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-9 w-9"
      >
        <Minus className="w-4 h-4" />
      </Button>
      <div className="min-w-[60px] text-center">
        <div className="font-display text-2xl font-medium tabular-nums">{value}</div>
        {label && (
          <div className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
            {label}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-9 w-9"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
