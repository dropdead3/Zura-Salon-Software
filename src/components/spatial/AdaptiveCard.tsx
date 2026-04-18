import { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import type { DensityProfile, SpatialState } from '@/lib/responsive/spatial-tokens';

interface AdaptiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: DensityProfile;
  /** Optional callback exposing the live spatial state to parent compositions. */
  onSpatialChange?: (state: SpatialState, width: number) => void;
}

/**
 * AdaptiveCard — measures its own container and exposes state via data-attribute.
 * Children may use sibling spatial primitives or their own useSpatialState().
 *
 * Padding floor is enforced via Tailwind classes per state (12px minimum).
 * Radius is proportional to density (large→2xl, standard→xl, compact→lg).
 *
 * Doctrine: mem://style/container-aware-responsiveness.md
 */
export const AdaptiveCard = forwardRef<HTMLDivElement, AdaptiveCardProps>(
  ({ density = 'standard', className, children, onSpatialChange, ...rest }, _externalRef) => {
    const { ref, state, width } = useSpatialState<HTMLDivElement>(density);

    if (onSpatialChange && width > 0) {
      onSpatialChange(state, width);
    }

    // Padding per state (never below p-3 = 12px floor)
    const paddingByState: Record<SpatialState, string> = {
      default: density === 'large' ? 'p-6' : density === 'compact' ? 'p-4' : 'p-5',
      compressed: density === 'large' ? 'p-5' : 'p-4',
      compact: 'p-3',
      stacked: 'p-3',
    };

    // Radius scales with density (proportional)
    const radiusByDensity: Record<DensityProfile, string> = {
      large: 'rounded-2xl',
      standard: 'rounded-xl',
      compact: 'rounded-lg',
    };

    return (
      <Card
        ref={ref}
        data-spatial-state={state}
        data-density={density}
        className={cn(
          'transition-[padding] duration-200 ease-out',
          radiusByDensity[density],
          paddingByState[state],
          className,
        )}
        {...rest}
      >
        {children}
      </Card>
    );
  },
);
AdaptiveCard.displayName = 'AdaptiveCard';
