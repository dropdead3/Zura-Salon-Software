/**
 * HeroParallaxScrollContext — bridges the hero parallax driver element to
 * the hero's scroll-driven animations.
 *
 * Why this exists:
 *   The hero's choreography (split-headline, blur, multi-layer parallax) is
 *   driven by `useScroll({ target: sectionRef })` inside
 *   `useHeroScrollAnimation`. When we wrap the hero in a sticky container
 *   (HeroParallaxLayout), the hero's own <section> element no longer moves
 *   relative to the viewport while the sticky parent is pinned — so
 *   `scrollYProgress` reads 0 the whole time and the animations never fire.
 *
 *   The fix is to bind useScroll to the TALL DRIVER element wrapping the
 *   sticky hero, not the hero itself. The driver's height defines the
 *   scroll runway; as the page scrolls, the driver moves through the
 *   viewport and `scrollYProgress` advances 0 → 1 normally.
 *
 *   This context lets `useHeroScrollAnimation` opt into the driver target
 *   when one is available, and silently fall back to its own sectionRef
 *   when not (i.e. when parallax is disabled — flat sites, edit-mode,
 *   reduced-motion, every existing tenant that hasn't opted in).
 *
 * Contract:
 *   - Provider value is the driver's RefObject<HTMLDivElement>, OR null.
 *   - `null` means "no parallax driver wrapping me — use my own ref".
 *   - The provider must be rendered ABOVE the hero in the React tree so
 *     the hero's `useHeroScrollAnimation` hook reads it during render.
 */
import { createContext, useContext, type RefObject } from 'react';

type DriverRef = RefObject<HTMLElement> | null;

const HeroParallaxScrollContext = createContext<DriverRef>(null);

export const HeroParallaxScrollProvider = HeroParallaxScrollContext.Provider;

/**
 * Returns the parallax driver ref when the hero is rendered inside a
 * `HeroParallaxLayout`, or null otherwise. Consumers should branch:
 *
 * ```ts
 * const driverRef = useHeroParallaxScrollTarget();
 * const target = driverRef ?? localSectionRef;
 * useScroll({ target });
 * ```
 */
export function useHeroParallaxScrollTarget(): DriverRef {
  return useContext(HeroParallaxScrollContext);
}
