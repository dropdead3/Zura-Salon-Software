/**
 * HeroBackground regression test — guards the two-layer overlay contract.
 *
 * History: `overlayOpacity` and `scrimStrength` were once fused into a single
 * value via `overlayOpacity ?? scrimStrength ?? 0.4`, which made the operator
 * "Image Wash" slider invisible whenever the scrim was a gradient (the bottom
 * gradient hid all wash changes at the top of the hero). The fix splits them
 * into two independently-rendered overlay divs:
 *
 *   data-hero-overlay="wash"  — flat uniform wash (Image Wash slider)
 *   data-hero-overlay="scrim" — gradient/vignette/flat shape (Text-area Scrim)
 *
 * If either layer disappears or they get re-fused, this test fails.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { HeroBackground } from './HeroBackground';

function renderHero(props: Parameters<typeof HeroBackground>[0]) {
  return render(
    <HelmetProvider>
      <HeroBackground {...props} />
    </HelmetProvider>,
  );
}

describe('HeroBackground overlay layering', () => {
  it('renders BOTH wash + scrim layers when overlayOpacity and scrimStrength are non-zero', () => {
    const { container } = renderHero({
      type: 'image',
      url: 'https://example.com/hero.jpg',
      overlayOpacity: 0.65,
      scrimStyle: 'gradient-bottom',
      scrimStrength: 0.55,
      overlayMode: 'darken',
    });

    const wash = container.querySelector('[data-hero-overlay="wash"]');
    const scrim = container.querySelector('[data-hero-overlay="scrim"]');

    expect(wash).not.toBeNull();
    expect(scrim).not.toBeNull();
    // jsdom's CSSOM rejects modern gradient syntax, leaving both
    // `.style.background` and the `style` attribute empty. Assert against the
    // outerHTML instead — that's the source-of-truth React emits.
    expect(wash!.outerHTML).toMatch(/rgba\(0,\s*0,\s*0,/);
    expect(scrim!.outerHTML).toMatch(/linear-gradient/);
  });

  it('omits the wash layer when overlayOpacity is 0', () => {
    const { container } = renderHero({
      type: 'image',
      url: 'https://example.com/hero.jpg',
      overlayOpacity: 0,
      scrimStyle: 'gradient-bottom',
      scrimStrength: 0.55,
      overlayMode: 'darken',
    });
    expect(container.querySelector('[data-hero-overlay="wash"]')).toBeNull();
    expect(container.querySelector('[data-hero-overlay="scrim"]')).not.toBeNull();
  });

  it('omits the scrim layer when scrimStyle is none', () => {
    const { container } = renderHero({
      type: 'image',
      url: 'https://example.com/hero.jpg',
      overlayOpacity: 0.4,
      scrimStyle: 'none',
      scrimStrength: 0.5,
      overlayMode: 'darken',
    });
    expect(container.querySelector('[data-hero-overlay="wash"]')).not.toBeNull();
    expect(container.querySelector('[data-hero-overlay="scrim"]')).toBeNull();
  });

  it('uses white tint for the wash when overlayMode is lighten', () => {
    const { container } = renderHero({
      type: 'image',
      url: 'https://example.com/hero.jpg',
      overlayOpacity: 0.5,
      scrimStyle: 'none',
      overlayMode: 'lighten',
    });
    const wash = container.querySelector('[data-hero-overlay="wash"]')!;
    expect(wash.outerHTML).toMatch(/rgba\(255,\s*255,\s*255,/);
  });
});
