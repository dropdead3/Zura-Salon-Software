/**
 * Locks the Hero Parallax contract:
 *  1. When `enabled=false`, renders the three slots flat — no driver,
 *     no sticky shell, no rising-panel chrome.
 *  2. When `enabled=true`, a tall driver wraps a sticky hero shell, and
 *     slot 1 gets the rising-panel treatment (rounded top + shadow,
 *     CRITICALLY no negative top margin → no bleed at rest).
 *  3. When `prefers-reduced-motion: reduce` is set, the effect silently
 *     no-ops even with `enabled=true`. Accessibility wins.
 *  4. Cinematic mode opts into the depth fade/scale via inline style on
 *     the sticky anchor; subtle mode does NOT add that style.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroParallaxLayout } from './HeroParallaxLayout';

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('reduce') ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('HeroParallaxLayout', () => {
  beforeEach(() => setReducedMotion(false));

  it('renders flat (no driver, no sticky shell) when disabled', () => {
    render(
      <HeroParallaxLayout
        enabled={false}
        hero={<div data-testid="hero">H</div>}
        next={<div data-testid="next">N</div>}
        rest={<div data-testid="rest">R</div>}
      />
    );
    expect(screen.queryByTestId('hero')).toBeInTheDocument();
    expect(screen.queryByTestId('next')).toBeInTheDocument();
    expect(document.querySelector('[data-hero-parallax="driver"]')).toBeNull();
    expect(document.querySelector('[data-hero-parallax="anchor"]')).toBeNull();
    expect(document.querySelector('[data-hero-parallax="rising"]')).toBeNull();
  });

  it('wraps the hero in a tall driver + sticky shell when enabled', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div data-testid="hero">H</div>}
        next={<div data-testid="next">N</div>}
        rest={<div data-testid="rest">R</div>}
      />
    );
    const driver = document.querySelector('[data-hero-parallax="driver"]') as HTMLElement;
    const anchor = document.querySelector('[data-hero-parallax="anchor"]') as HTMLElement;
    const rising = document.querySelector('[data-hero-parallax="rising"]') as HTMLElement;
    expect(driver).not.toBeNull();
    expect(anchor).not.toBeNull();
    expect(rising).not.toBeNull();

    // Driver wraps the anchor; anchor wraps the hero.
    expect(driver.contains(anchor)).toBe(true);
    expect(anchor.contains(screen.getByTestId('hero'))).toBe(true);
    // Rising panel sits OUTSIDE the driver (so at scroll 0 it's below the fold).
    expect(driver.contains(rising)).toBe(false);
    expect(rising.contains(screen.getByTestId('next'))).toBe(true);

    // Driver must be tall enough to give the sticky shell a scroll runway.
    expect(driver.style.height).toMatch(/vh$/);
    const runwayVh = parseInt(driver.style.height, 10);
    expect(runwayVh).toBeGreaterThanOrEqual(100);
  });

  it('rising panel has NO negative top margin (regression guard for the bleed-at-rest bug)', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    const rising = document.querySelector('[data-hero-parallax="rising"]') as HTMLElement;
    // The class list must not contain any -mt-* utility — that was the
    // exact cause of the original bug (rounded edge appearing over the
    // hero before the user scrolled).
    expect(rising.className).not.toMatch(/(^|\s)-mt-/);
  });

  it('silently no-ops when prefers-reduced-motion is set, even with enabled=true', () => {
    setReducedMotion(true);
    render(
      <HeroParallaxLayout
        enabled
        hero={<div data-testid="hero">H</div>}
        next={<div data-testid="next">N</div>}
        rest={<div data-testid="rest">R</div>}
      />
    );
    expect(document.querySelector('[data-hero-parallax="driver"]')).toBeNull();
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('applies depth fade/scale style to the sticky anchor only in cinematic mode', () => {
    const { rerender } = render(
      <HeroParallaxLayout
        enabled
        mode="subtle"
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    let driver = document.querySelector('[data-hero-parallax="driver"]') as HTMLElement;
    let anchor = document.querySelector('[data-hero-parallax="anchor"]') as HTMLElement;
    expect(driver.getAttribute('data-hero-parallax-mode')).toBe('subtle');
    expect(anchor.getAttribute('style') ?? '').not.toContain('--hero-parallax-progress');

    rerender(
      <HeroParallaxLayout
        enabled
        mode="cinematic"
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    driver = document.querySelector('[data-hero-parallax="driver"]') as HTMLElement;
    anchor = document.querySelector('[data-hero-parallax="anchor"]') as HTMLElement;
    expect(driver.getAttribute('data-hero-parallax-mode')).toBe('cinematic');
    const styleAttr = anchor.getAttribute('style') ?? '';
    expect(styleAttr).toContain('--hero-parallax-progress');
  });
});
