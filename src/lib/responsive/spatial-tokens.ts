/**
 * Spatial Tokens — numeric constants for container-aware responsiveness.
 * See mem://style/container-aware-responsiveness.md for full doctrine.
 */

export const SPATIAL_THRESHOLDS = {
  /** Pressure ratios that trigger each compression phase (0..1). */
  spacingCompress: 0.88,
  typographyCompress: 0.92,
  truncate: 0.95,
  condense: 0.98,
} as const;

export const SPATIAL_PADDING = {
  large: 24,
  standard: 20,
  compact: 16,
  /** Floor — never go below this on cards. */
  min: 12,
} as const;

export const SPATIAL_GAP = {
  standard: 16,
  dense: 12,
  /** Floor — adjacent controls must never visually collapse below this. */
  min: 8,
} as const;

export const SPATIAL_RADIUS = {
  outerShell: 24,
  majorInner: 20,
  nested: 16,
  chip: 12,
  micro: 8,
} as const;

/** Container-width thresholds (measured, NOT viewport). */
export const SPATIAL_BREAKPOINTS = {
  threeColumn: 560,
  twoColumn: 360,
  /** Below this → stacked layout */
  stacked: 360,
} as const;

export const SPATIAL_TEXT_FLOOR = {
  /** Min font sizes (px) per role. */
  supporting: 12,
  primaryCard: 14,
  metadata: 11,
} as const;

export const SPATIAL_TAP_TARGET_MIN = 44; // px

export const SPATIAL_MOTION = {
  micro: 180, // ms — spacing/typography/truncation
  layout: 260, // ms — structural shifts
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out, refined
} as const;

export type SpatialState = 'default' | 'compressed' | 'compact' | 'stacked';

export type DensityProfile = 'large' | 'standard' | 'compact';

/** Per-density expected content width target (used to compute pressure). */
export const DENSITY_EXPECTED_WIDTH: Record<DensityProfile, number> = {
  large: 720,
  standard: 560,
  compact: 360,
};
