/**
 * Regression guard for the "rising panel bleeds into the hero at rest" bug.
 *
 * History:
 *   v1 — `-mt-8` negative margin pulled the panel UP over the hero at
 *        scroll 0. Fixed by removing the negative margin and placing the
 *        panel as a sibling AFTER a tall driver.
 *   v2 (current) — to make hero exit + panel rise CONCURRENT (not
 *        sequential), the panel now lives INSIDE the driver, anchored at
 *        `absolute bottom-0`, translated down by
 *        `(1 - --hero-parallax-progress) * 100vh`. At rest (progress=0)
 *        that's translateY(100vh) — exactly one viewport below the fold,
 *        same no-bleed guarantee, but now the same scroll progress that
 *        fades the hero ALSO lifts the panel.
 *
 * jsdom doesn't lay out, so we lock the structural invariants that
 * prove no-bleed-at-rest WITHOUT depending on pixel measurements:
 *   - driver carries an explicit vh height >= 100 (scroll runway exists)
 *   - rising panel has no -mt-* class (the original bug)
 *   - rising panel is absolutely positioned at bottom-0 of the driver
 *   - rising panel's transform interpolates --hero-parallax-progress
 *     (so progress=0 → translateY(100vh) → off-screen at rest)
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeroParallaxLayout } from './HeroParallaxLayout';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false, media: '', onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe('HeroParallaxLayout · no-bleed-at-rest', () => {
  it('driver provides at least one viewport-height of scroll runway', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    const driver = document.querySelector('[data-hero-parallax="driver"]') as HTMLElement;
    const heightAttr = driver.style.height;
    expect(heightAttr).toMatch(/vh$/);
    expect(parseInt(heightAttr, 10)).toBeGreaterThanOrEqual(100);
  });

  it('rising panel uses no negative top margin (the original v1 bug class)', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    const rising = document.querySelector('[data-hero-parallax="rising"]') as HTMLElement;
    expect(rising.className).not.toMatch(/(^|\s)-mt-/);
  });

  it('rising panel is anchored at bottom-0 inside the driver, off-screen at rest', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    const driver = document.querySelector('[data-hero-parallax="driver"]')!;
    const rising = document.querySelector('[data-hero-parallax="rising"]') as HTMLElement;
    // v2 contract: rising lives INSIDE the driver so it can translate up
    // in lockstep with hero exit progress.
    expect(driver.contains(rising)).toBe(true);
    // Anchored at the bottom — at rest (progress=0) the translate pushes
    // it 100vh further down, i.e. one viewport below the fold.
    expect(rising.className).toMatch(/(^|\s)bottom-0(\s|$)/);
    expect(rising.className).toMatch(/(^|\s)absolute(\s|$)/);
    expect(rising.style.transform).toContain('--hero-parallax-progress');
    expect(rising.style.transform).toContain('100vh');
  });
});
