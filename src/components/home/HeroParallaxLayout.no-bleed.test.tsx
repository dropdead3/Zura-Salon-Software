/**
 * Regression guard for the "rising panel bleeds into the hero at rest" bug.
 *
 * Before the structural fix: the rising panel used `-mt-8` to hide the
 * seam between hero and next section. That negative margin pulled the
 * panel UP over the hero at scroll position 0, exposing its rounded edge
 * over the hero before any scrolling — visible in the May 2026 screenshot
 * the user reported.
 *
 * After the fix: the rising panel sits at normal flow position, AFTER a
 * tall driver element. At rest, that puts the rising panel one driver-
 * height (>= 100vh) below the fold — fully out of sight.
 *
 * jsdom doesn't lay out, so we can't read pixel positions directly. We
 * lock the structural invariants that REPLACE the layout proof:
 *   - rising panel is a sibling AFTER the driver in DOM order
 *   - driver carries an explicit vh height >= 100
 *   - rising panel has no -mt-* class
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
  it('rising panel is a sibling AFTER the driver, never a descendant of it', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    const driver = document.querySelector('[data-hero-parallax="driver"]')!;
    const rising = document.querySelector('[data-hero-parallax="rising"]')!;
    expect(driver.contains(rising)).toBe(false);
    // DOM order: driver must come BEFORE rising.
    expect(
      driver.compareDocumentPosition(rising) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

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

  it('rising panel uses no negative top margin (the original bug class)', () => {
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
});
