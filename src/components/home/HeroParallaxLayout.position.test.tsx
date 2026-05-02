/**
 * Position-aware reorder spec.
 *
 * The Hero Parallax effect attaches to slot index 1 — NOT to the
 * "services" or any other section type. Whatever the operator drags into
 * slot 2 (1-indexed) inherits the rising-panel treatment. This guarantees
 * we never accidentally type-couple the effect to a particular section.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('HeroParallaxLayout · position-aware reorder', () => {
  it('rising panel always wraps the literal slot 1 node, regardless of identity', () => {
    const cases = [
      { id: 'services', node: <div data-testid="rising">Services</div> },
      { id: 'gallery',  node: <div data-testid="rising">Gallery</div> },
      { id: 'faq',      node: <div data-testid="rising">FAQ</div> },
    ];
    for (const c of cases) {
      const { unmount } = render(
        <HeroParallaxLayout
          enabled
          hero={<div data-testid="hero">Hero</div>}
          next={c.node}
          rest={<div data-testid="rest">Rest</div>}
        />
      );
      const rising = document.querySelector('[data-hero-parallax="rising"]')!;
      expect(rising.contains(screen.getByTestId('rising'))).toBe(true);
      // The hero must NOT be inside the rising container.
      expect(rising.contains(screen.getByTestId('hero'))).toBe(false);
      unmount();
    }
  });
});
