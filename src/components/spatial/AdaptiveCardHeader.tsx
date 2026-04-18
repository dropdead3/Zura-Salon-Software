import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import type { LucideIcon } from 'lucide-react';

interface AdaptiveCardHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Right-side controls (filters, badges, actions). Collapses into overflow at compact/stacked. */
  actions?: ReactNode;
  /** Inline tooltip slot (e.g. <MetricInfoTooltip />) — sits next to title. */
  titleAffix?: ReactNode;
  className?: string;
}

/**
 * AdaptiveCardHeader — canonical header with collision logic.
 * - default/compressed: two-column (title left, actions right)
 * - compact: actions wrap below title with reduced gap
 * - stacked: actions stack as a vertical rail under the title
 *
 * Doctrine: mem://style/container-aware-responsiveness.md
 */
export function AdaptiveCardHeader({
  icon: Icon,
  title,
  description,
  actions,
  titleAffix,
  className,
}: AdaptiveCardHeaderProps) {
  const { ref, state } = useSpatialState<HTMLDivElement>('standard');

  const isStacked = state === 'stacked';
  const isCompact = state === 'compact';

  return (
    <div
      ref={ref}
      data-spatial-state={state}
      className={cn(
        'flex w-full',
        isStacked || isCompact
          ? 'flex-col gap-3 items-stretch'
          : 'flex-row items-start justify-between gap-4',
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className={tokens.card.iconBox}>
            <Icon className={tokens.card.icon} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={cn(tokens.card.title, 'truncate')}>{title}</h3>
            {titleAffix}
          </div>
          {description && (
            <p className={cn(tokens.body.muted, 'mt-1', isCompact && 'line-clamp-1')}>
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div
          className={cn(
            'flex items-center gap-2 shrink-0',
            isStacked && 'w-full justify-start flex-wrap',
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
