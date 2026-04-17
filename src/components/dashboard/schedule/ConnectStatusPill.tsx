/**
 * ConnectStatusPill — calendar-surface advisory marker.
 *
 * Doctrine: silence is valid output. Renders nothing when the location's
 * Stripe Connect is active. When inactive, surfaces a single low-contrast
 * pill so operators learn the constraint *before* opening checkout —
 * eliminating the "open → see banner → close" loop.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConnectStatusPillProps {
  /** Whether the location's Stripe Connect onboarding is active. */
  active: boolean;
  className?: string;
}

export function ConnectStatusPill({ active, className }: ConnectStatusPillProps) {
  if (active) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center font-sans text-[10px] px-1.5 py-0.5 rounded-full',
            'bg-warning/10 text-warning border border-warning/30 whitespace-nowrap shrink-0',
            className,
          )}
          aria-label="Card payments unavailable for this location"
        >
          Setup needed
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs">
        <p className="font-medium">Card payments unavailable</p>
        <p className="text-muted-foreground">
          Finish Stripe Connect onboarding for this location to accept card-present
          and Send-to-Pay charges.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
