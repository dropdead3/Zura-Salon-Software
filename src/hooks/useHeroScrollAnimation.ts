/**
 * useHeroScrollAnimation — single source of truth for the hero's scroll-driven
 * exit choreography (split-headline parallax + blur + multi-layer fade-out).
 *
 * Previously the same 8 transforms with the same magic ranges
 * (`[0, 0.5]`, `[0, 0.3]`, `[0, 0.4]`, etc.) lived inline in BOTH
 * `HeroSection.tsx` and `HeroSlideRotator.tsx`. When the rotator ported the
 * effect over, drift between the two files would silently desync the
 * choreography on tenants that still rendered the static hero. Centralizing
 * here kills that divergence permanently.
 *
 * Callers:
 *   - Pass a `ref` for the hero `<section>` (the scroll target).
 *   - Set `enabled=false` in editor preview / when reduced-motion is on; the
 *     hook still wires `useScroll` so React hook order is stable across
 *     renders, but consumers should branch on `enabled` when applying styles
 *     (e.g. `style={enabled ? { y: headlineY } : undefined}`).
 *
 * Tuning constants live ONLY in this file. Do not duplicate the magic ranges
 * downstream — extend the hook instead.
 */
import { useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { RefObject } from 'react';

interface UseHeroScrollAnimationOptions {
  /** The hero `<section>` ref. Scroll progress is tracked relative to this element. */
  target: RefObject<HTMLElement>;
  /**
   * Whether the choreography is "live". When false, the hook still binds
   * `useScroll` (preserving hook order) but consumers should skip applying
   * the returned motion values to keep the canvas static. Typically:
   * `enabled = !isPreview && !reduceMotion`.
   */
  enabled: boolean;
}

export interface HeroScrollAnimation {
  enabled: boolean;
  scrollYProgress: MotionValue<number>;
  /** Whole-section opacity 1 → 0 across the first half of the scroll range. */
  sectionOpacity: MotionValue<number>;
  /** Heading-specific blur filter string, e.g. `"blur(7.5px)"`. */
  headingBlurFilter: MotionValue<string>;
  /** Headline opacity 1 → 0 (independent from section opacity for tighter feel). */
  headlineScrollOpacity: MotionValue<number>;
  /** Parallax Y offsets — each layer moves at a different speed for depth. */
  taglineY: MotionValue<number>;
  headlineY: MotionValue<number>;
  subheadlineY: MotionValue<number>;
  ctaY: MotionValue<number>;
  /** Headline split-line horizontal offsets (top line → left, bottom line → right). */
  topLineX: MotionValue<number>;
  bottomLineX: MotionValue<number>;
}

export function useHeroScrollAnimation({
  target,
  enabled,
}: UseHeroScrollAnimationOptions): HeroScrollAnimation {
  // useScroll is bound unconditionally so hook order stays stable when the
  // caller's `enabled` flag flips (e.g. reduced-motion media query change).
  const { scrollYProgress } = useScroll({
    target,
    offset: ['start start', 'end start'],
  });

  // Whole-section + headline opacity fade.
  const sectionOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const headlineScrollOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  // Heading-specific blur (kicks in earlier + more intense than section fade).
  const headingBlur = useTransform(scrollYProgress, [0, 0.3], [0, 15]);
  const headingBlurFilter = useTransform(headingBlur, (v) => `blur(${v}px)`);

  // Multi-layer parallax — staggered speeds create depth as the user scrolls
  // past the hero. Tagline barely moves; CTAs travel the furthest.
  const taglineY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const subheadlineY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const ctaY = useTransform(scrollYProgress, [0, 1], [0, -200]);

  // Headline split: top line drifts left, bottom (rotating word) drifts right.
  const topLineX = useTransform(scrollYProgress, [0, 0.4], [0, -150]);
  const bottomLineX = useTransform(scrollYProgress, [0, 0.4], [0, 150]);

  return {
    enabled,
    scrollYProgress,
    sectionOpacity,
    headingBlurFilter,
    headlineScrollOpacity,
    taglineY,
    headlineY,
    subheadlineY,
    ctaY,
    topLineX,
    bottomLineX,
  };
}
