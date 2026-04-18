import { useMemo } from 'react';
import { useContainerSize } from './useContainerSize';
import {
  SPATIAL_BREAKPOINTS,
  SPATIAL_THRESHOLDS,
  DENSITY_EXPECTED_WIDTH,
  type DensityProfile,
  type SpatialState,
} from './spatial-tokens';

export interface SpatialReading {
  /** Live container width in px. 0 until first measurement. */
  width: number;
  /** Authored state derived from width + density. */
  state: SpatialState;
  /** Stress ratio 0..1 — proportion of "expected" width consumed. */
  pressure: number;
  /** True once container has been measured at least once. */
  measured: boolean;
}

/**
 * useSpatialState — composes useContainerSize + density profile into an authored state.
 *
 * Usage:
 *   const { ref, state, pressure } = useSpatialState('standard');
 *   return <div ref={ref} data-spatial-state={state}>...</div>;
 *
 * Doctrine: mem://style/container-aware-responsiveness.md
 */
export function useSpatialState<T extends HTMLElement = HTMLDivElement>(
  density: DensityProfile = 'standard',
) {
  const { ref, width, height } = useContainerSize<T>();

  const reading = useMemo<SpatialReading>(() => {
    if (width === 0) {
      return { width: 0, state: 'default', pressure: 0, measured: false };
    }

    const expected = DENSITY_EXPECTED_WIDTH[density];
    const pressure = Math.min(1, expected / Math.max(width, 1));

    let state: SpatialState;
    if (width < SPATIAL_BREAKPOINTS.stacked) {
      state = 'stacked';
    } else if (width < SPATIAL_BREAKPOINTS.threeColumn) {
      // Below 3-col threshold but above stacked → compact or compressed
      state = pressure >= SPATIAL_THRESHOLDS.condense ? 'compact' : 'compressed';
    } else if (pressure >= SPATIAL_THRESHOLDS.spacingCompress) {
      state = 'compressed';
    } else {
      state = 'default';
    }

    return { width, state, pressure, measured: true };
  }, [width, density]);

  return { ref, height, ...reading };
}
