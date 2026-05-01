/**
 * HERO_OVERLAY_ANCHORS — canonical positioning for absolute-positioned
 * hero overlay elements (slider arrows, scroll indicator, future CTAs).
 *
 * Use these tokens instead of hardcoding `bottom-8 left-8` etc. so the
 * three-anchor footer (left / center / right) stays visually aligned
 * and any vertical-rhythm change happens in one place.
 *
 * Mobile-aware: edges use `left-4 sm:left-8` to breathe on phones.
 */
export const HERO_OVERLAY_ANCHORS = {
  bottomLeft: 'absolute bottom-8 left-4 sm:left-8 z-20',
  bottomCenter: 'absolute bottom-8 inset-x-0 mx-auto w-fit z-20',
  bottomRight: 'absolute bottom-8 right-4 sm:right-8 z-20',
} as const;
