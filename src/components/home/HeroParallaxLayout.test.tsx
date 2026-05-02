/**
 * Locks the Hero Parallax contract:
 *  1. When `enabled=false`, renders the three slots flat — no sticky shell,
 *     no rising panel chrome. (Operator opt-in only.)
 *  2. When `enabled=true`, slot 0 becomes a sticky anchor and slot 1 gets
 *     the rising-panel treatment. Position-aware — the layout doesn't care
 *     what type lives in slot 1.
 *  3. When `prefers-reduced-motion: reduce` is set, the effect silently
 *     no-ops even with `enabled=true`. Accessibility is non-negotiable.
 *  4. Cinematic mode opts into the depth fade/scale via inline style on
 *     the anchor; subtle mode does NOT add that style.
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

  it('renders flat (no sticky shell) when disabled', () => {
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
    expect(document.querySelector('[data-hero-parallax="anchor"]')).toBeNull();
    expect(document.querySelector('[data-hero-parallax="rising"]')).toBeNull();
  });

  it('wraps slot 0 as sticky anchor and slot 1 as rising panel when enabled', () => {
    render(
      <HeroParallaxLayout
        enabled
        hero={<div data-testid="hero">H</div>}
        next={<div data-testid="next">N</div>}
        rest={<div data-testid="rest">R</div>}
      />
    );
    const anchor = document.querySelector('[data-hero-parallax="anchor"]');
    const rising = document.querySelector('[data-hero-parallax="rising"]');
    expect(anchor).not.toBeNull();
    expect(rising).not.toBeNull();
    expect(anchor!.contains(screen.getByTestId('hero'))).toBe(true);
    expect(rising!.contains(screen.getByTestId('next'))).toBe(true);
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
    // Accessibility wins over the operator toggle.
    expect(document.querySelector('[data-hero-parallax="anchor"]')).toBeNull();
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('applies depth fade/scale style only in cinematic mode', () => {
    const { rerender } = render(
      <HeroParallaxLayout
        enabled
        mode="subtle"
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    let anchor = document.querySelector('[data-hero-parallax="anchor"]') as HTMLElement;
    expect(anchor.getAttribute('data-hero-parallax-mode')).toBe('subtle');
    expect(anchor.style.opacity).toBe('');
    expect(anchor.style.transform).toBe('');

    rerender(
      <HeroParallaxLayout
        enabled
        mode="cinematic"
        hero={<div>H</div>}
        next={<div>N</div>}
        rest={<div>R</div>}
      />
    );
    anchor = document.querySelector('[data-hero-parallax="anchor"]') as HTMLElement;
    expect(anchor.getAttribute('data-hero-parallax-mode')).toBe('cinematic');
    // Style references the parallax progress CSS variable.
    expect(anchor.style.opacity).toContain('--hero-parallax-progress');
    expect(anchor.style.transform).toContain('--hero-parallax-progress');
  });
});
