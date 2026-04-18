import type { SpatialState } from './spatial-tokens';

export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Visibility matrix — which priority levels render at each spatial state.
 * P0 always renders. P3 hides first (compact+). P2 hides at stacked.
 * P1 always renders unless component author overrides.
 */
const VISIBILITY: Record<SpatialState, Record<PriorityLevel, boolean>> = {
  default: { P0: true, P1: true, P2: true, P3: true },
  compressed: { P0: true, P1: true, P2: true, P3: true },
  compact: { P0: true, P1: true, P2: true, P3: false },
  stacked: { P0: true, P1: true, P2: false, P3: false },
};

export function isVisibleByPriority(level: PriorityLevel, state: SpatialState): boolean {
  return VISIBILITY[state][level];
}

/**
 * Map content type → truncation strategy.
 * Doctrine: never truncate money/time/percent/count.
 */
export type ContentKind = 'name' | 'identifier' | 'numeric' | 'description' | 'label';

export function truncationStrategyFor(kind: ContentKind): 'end' | 'middle' | 'none' {
  switch (kind) {
    case 'name':
    case 'description':
    case 'label':
      return 'end';
    case 'identifier':
      return 'middle';
    case 'numeric':
      return 'none';
  }
}
