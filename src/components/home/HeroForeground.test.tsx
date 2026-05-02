/**
 * HeroForeground isolation test.
 *
 * Why this exists:
 *   The rotator's full-render scroll-fx test (`HeroSlideRotator.scroll-fx`)
 *   covers the wired pipeline end-to-end, but it requires a scroll target
 *   and exercises the entire rotator shell (background layers, slide
 *   sequencing, ref measurement, etc.). That makes it expensive and gives
 *   us no signal about the foreground component's *own* contract.
 *
 *   Now that `HeroForeground` is pure (motion values injected via props,
 *   no scroll hooks of its own), we can render it in complete isolation
 *   with mock motion values. That gets us cheap parity coverage of the
 *   contract that matters most:
 *
 *     1. Live mode wires the scroll-fx motion values onto the <h1>
 *        (transform/filter inline styles present).
 *     2. Disabled mode (preview canvas) leaves the <h1> static — no
 *        blur(), no transform from motion values.
 *     3. The headline + subheadline + CTAs render with the slide payload.
 *
 *   This is the same parity pattern enforced for HeroNotes / HeroEyebrow /
 *   HeroScrollIndicator — pure subcomponent + isolation render = the
 *   refactor-resistant contract surface.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { motionValue } from 'framer-motion';
import { HeroForeground } from './HeroForeground';
import { resolveHeroColors } from '@/lib/heroColors';
import { resolveHeroAlignment } from '@/lib/heroAlignment';
import { resolveHeroSpacing } from '@/lib/heroSpacing';
import { DEFAULT_HERO, type HeroConfig, type HeroSlide } from '@/hooks/useSectionConfig';

function makeSlide(overrides: Partial<HeroSlide> = {}): HeroSlide {
  return {
    id: 'fg-test-slide',
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
    headline_text: 'Foreground Headline',
    subheadline_line1: 'Subheadline copy',
    subheadline_line2: '',
    cta_new_client: 'Book Now',
    cta_new_client_url: '',
    cta_returning_client: 'Learn More',
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

/**
 * Build the scrollFx prop with mock MotionValues. Using real `motionValue()`
 * (not raw numbers) keeps the test honest — framer-motion's style serializer
 * runs the actual MotionValue → inline-style pipeline, so a future regression
 * that swaps MotionValue for plain numbers (and silently breaks the scroll
 * choreography) would still fail this test instead of mock-passing.
 */
function makeScrollFx(enabled: boolean) {
  return {
    enabled,
    taglineY: motionValue(0),
    headlineY: motionValue(0),
    subheadlineY: motionValue(0),
    ctaY: motionValue(0),
    topLineX: motionValue(0),
    bottomLineX: motionValue(0),
    headingBlurFilter: motionValue('blur(0px)'),
    headlineScrollOpacity: motionValue(1),
  };
}

function renderForeground({
  isPreview,
  scrollEnabled,
  slide = makeSlide(),
}: {
  isPreview: boolean;
  scrollEnabled: boolean;
  slide?: HeroSlide;
}) {
  const config: HeroConfig = { ...DEFAULT_HERO };
  const heroColors = resolveHeroColors({}, /* hasBackground */ false);
  const alignment = resolveHeroAlignment('center');
  const spacing = resolveHeroSpacing('compact');

  return render(
    <MemoryRouter>
      <HeroForeground
        slide={slide}
        config={config}
        activeIndex={0}
        rotatorMode="background_only"
        isPreview={isPreview}
        hasBackground={false}
        heroColors={heroColors}
        mutedTone="text-muted-foreground"
        alignment={alignment}
        spacing={spacing}
        rotatingWords={[]}
        showRotatingWords={false}
        wordIndex={0}
        scrollFx={makeScrollFx(scrollEnabled)}
      />
    </MemoryRouter>,
  );
}

describe('HeroForeground — isolation render', () => {
  it('attaches motion-value-driven style.filter + style.transform to <h1> when scroll-fx is enabled', () => {
    const { container } = renderForeground({ isPreview: false, scrollEnabled: true });

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();

    const inlineStyle = h1!.getAttribute('style') ?? '';
    expect(
      inlineStyle.includes('blur('),
      `Expected <h1> inline style to include blur() filter (proves headingBlurFilter motion value attached). Got:\n  ${inlineStyle}`,
    ).toBe(true);
    expect(
      /(^|;)\s*transform\s*:/.test(inlineStyle),
      `Expected <h1> inline style to include a transform declaration (proves headlineY motion value attached). Got:\n  ${inlineStyle}`,
    ).toBe(true);
  });

  it('does NOT attach scroll-fx styles to <h1> when scroll-fx is disabled (static canvas)', () => {
    const { container } = renderForeground({ isPreview: true, scrollEnabled: false });

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    const inlineStyle = h1!.getAttribute('style') ?? '';
    expect(inlineStyle).not.toContain('blur(');
  });

  it('renders the slide headline, subheadline, and primary CTA copy', () => {
    const slide = makeSlide({
      headline_text: 'Custom Headline Copy',
      subheadline_line1: 'A tagline that operators set.',
      cta_new_client: 'Reserve a Chair',
    });
    const { container, getByText } = renderForeground({
      isPreview: false,
      scrollEnabled: true,
      slide,
    });

    expect(container.querySelector('h1')?.textContent).toContain('Custom Headline Copy');
    expect(getByText('A tagline that operators set.')).toBeTruthy();
    expect(getByText('Reserve a Chair')).toBeTruthy();
  });

  it('renders the secondary CTA only when show_secondary_button is true', () => {
    const { queryByText: queryHidden } = renderForeground({
      isPreview: false,
      scrollEnabled: true,
      slide: makeSlide({ show_secondary_button: false, cta_returning_client: 'Returning' }),
    });
    expect(queryHidden('Returning')).toBeNull();

    const { getByText } = renderForeground({
      isPreview: false,
      scrollEnabled: true,
      slide: makeSlide({ show_secondary_button: true, cta_returning_client: 'Returning' }),
    });
    expect(getByText('Returning')).toBeTruthy();
  });
});
