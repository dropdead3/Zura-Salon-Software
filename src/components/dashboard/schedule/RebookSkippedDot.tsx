/**
 * RebookSkippedDot — quiet calendar-level marker for completed appointments
 * where the operator captured a "skip rebook" reason.
 *
 * Doctrine alignment: extends the receipt pattern — silent until something
 * happened, then a single low-contrast dot with a tooltip that names the
 * captured reason. No CTA, no border, no count. Pattern-spotting only.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RebookSkippedDotProps {
  /** Human-readable label (e.g. from getReasonLabel) */
  label: string;
  className?: string;
}

export function RebookSkippedDot({ label, className }: RebookSkippedDotProps) {
  // Trim "Client declined — " style prefix so the tooltip stays scannable
  const dashIdx = label.indexOf('—');
  const shortLabel = dashIdx >= 0 ? label.slice(dashIdx + 1).trim() : label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0 ${className ?? ''}`}
          aria-label={`Rebook skipped: ${shortLabel}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">Rebook skipped</p>
        <p className="text-muted-foreground">{shortLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
}
