/**
 * Single source of truth for the slide-background type toggle (None /
 * Image / Video) rendered in HeroSlideEditor and HeroSlidesManager.
 *
 * Rationale: per Preview-Live Parity canon, the same UI shown in two
 * surfaces must share a single label map — otherwise renames drift
 * between the two and the label silently desyncs.
 */

export type SlideBackgroundType = 'inherit' | 'image' | 'video';

export const SLIDE_BG_TYPE_OPTIONS = ['inherit', 'image', 'video'] as const satisfies readonly SlideBackgroundType[];

export const SLIDE_BG_TYPE_LABELS: Record<SlideBackgroundType, string> = {
  inherit: 'None',
  image: 'Image',
  video: 'Video',
};

/**
 * Tooltip strings — `None` is shorter than the previous "Use Section
 * BG" label but loses the cue that the slide will fall back to the
 * hero/section background. The tooltip preserves that affordance
 * without lengthening the visible label.
 */
export const SLIDE_BG_TYPE_TOOLTIPS: Record<SlideBackgroundType, string> = {
  inherit: "Falls back to the hero's default background",
  image: 'Use a per-slide image',
  video: 'Use a per-slide video',
};
