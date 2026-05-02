/**
 * Hero scroll-fx regression guard.
 *
 * Locks the scroll-driven exit choreography (split-headline parallax + blur +
 * multi-layer fade-out) so the next hero refactor cannot silently strip it
 * again — the exact failure mode that produced the May 2026 "we lost all the
 * hero animations" bug report when the rotator first replaced the static hero.
 *
 * Two invariants:
 *   1. `useScroll` is bound to the hero <section> on the live (non-preview)
 *      render — verified by spying on framer-motion's `useScroll` export.
 *   2. The `<h1>` carries motion-value driven `style.filter` and `style.y`
 *      props on the live render, and does NOT carry them in editor preview
 *      mode (operators need a static canvas).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import * as framerMotion from 'framer-motion';
import { HeroSlideRotator } from './HeroSlideRotator';
import { DEFAULT_HERO, type HeroConfig, type HeroSlide } from '@/hooks/useSectionConfig';

function makeSlide(overrides: Partial<HeroSlide> = {}): HeroSlide {
  return {
    id: 'slide-scroll-fx-1',
    background_type: 'inherit',
    background_url: '',
    background_poster_url: '',
    overlay_opacity: null,
    scrim_style: null,
    scrim_strength: null,
    background_focal_x: null,
    background_focal_y: null,
    overlay_mode: null,
    background_fit: null,
    eyebrow: '',
    show_eyebrow: false,
    headline_text: 'Scroll FX Headline',
    subheadline_line1: '',
    subheadline_line2: '',
    cta_new_client: 'Book',
    cta_new_client_url: '',
    cta_returning_client: 'Learn',
    cta_returning_client_url: '/booking',
    show_secondary_button: false,
    text_colors: undefined,
    media_width: null,
    media_height: null,
    media_size_bytes: null,
    media_format: null,
    media_optimized_with_profile: null,
    content_alignment: null,
    ...overrides,
  };
}

function renderRotator(config: HeroConfig, isPreview: boolean) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <HeroSlideRotator config={config} isPreview={isPreview} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('HeroSlideRotator — scroll-fx regression guard', () => {
  let useScrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useScrollSpy = vi.spyOn(framerMotion, 'useScroll');
  });
  afterEach(() => {
    useScrollSpy.mockRestore();
  });

  it('binds useScroll to the hero <section> on the live (non-preview) render', () => {
    const config: HeroConfig = { ...DEFAULT_HERO, slides: [makeSlide()] };
    renderRotator(config, /* isPreview */ false);

    // The hook is invoked unconditionally to keep React hook order stable.
    expect(useScrollSpy).toHaveBeenCalled();
    const args = useScrollSpy.mock.calls[0]?.[0] as
      | { target?: { current: HTMLElement | null }; offset?: unknown }
      | undefined;
    expect(args?.target).toBeDefined();
    // `target` is a ref object — its `.current` should resolve to the rendered
    // <section> after mount (proves the ref was actually attached, not just
    // a fresh disconnected ref handed off by the rotator).
    expect(args!.target!.current?.tagName).toBe('SECTION');
    // Range covers the full hero exit; documented in useHeroScrollAnimation.
    expect(args?.offset).toEqual(['start start', 'end start']);
  });

  it('attaches motion-value-driven style.filter + style.y to <h1> on the live render', () => {
    const config: HeroConfig = { ...DEFAULT_HERO, slides: [makeSlide()] };
    const { container } = renderRotator(config, /* isPreview */ false);

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();

    // Framer-motion serializes MotionValues into the inline style string at
    // mount: `filter: blur(0px); transform: translateY(0px) ...`. The
    // presence of these tokens proves the rotator wired the choreography
    // (raw static styles wouldn't include them).
    const inlineStyle = h1!.getAttribute('style') ?? '';
    expect(
      inlineStyle.includes('blur('),
      `Expected <h1> inline style to include blur() filter (proves headingBlurFilter motion value attached). Got:\n  ${inlineStyle}`,
    ).toBe(true);
    expect(
      inlineStyle.includes('translateY') || inlineStyle.includes('translate('),
      `Expected <h1> inline style to include translateY/translate() (proves headlineY motion value attached). Got:\n  ${inlineStyle}`,
    ).toBe(true);
  });

  it('does NOT attach the scroll-fx styles in editor preview mode (static canvas)', () => {
    const config: HeroConfig = { ...DEFAULT_HERO, slides: [makeSlide()] };
    const { container } = renderRotator(config, /* isPreview */ true);

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    const inlineStyle = h1!.getAttribute('style') ?? '';
    // The preview canvas must stay still so operators can edit. The blur()
    // filter is the cleanest signal — it would never appear here organically.
    expect(inlineStyle).not.toContain('blur(');
  });
});
