import { forwardRef } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MetricInfoTooltipProps {
  description: string;
  title?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Wrap the lucide Info icon in a forwardRef'd span so Radix Tooltip can attach
 * its ref via `asChild` without warning. Wave 17 (high-concurrency-scalability):
 * the Settings grid renders ~30 of these eagerly; silencing the ref warning
 * also removes a measurable render-path cost on every dashboard route.
 */
const InfoIconTrigger = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { iconClassName?: string }>(
  ({ iconClassName, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('inline-flex items-center justify-center cursor-help', className)}
      {...props}
    >
      <Info className={cn('w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0', iconClassName)} />
    </span>
  ),
);
InfoIconTrigger.displayName = 'InfoIconTrigger';

export function MetricInfoTooltip({ description, title, side = 'top', className }: MetricInfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InfoIconTrigger iconClassName={className} />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[280px] text-xs">
        {title && <p className="font-medium mb-1">{title}</p>}
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
