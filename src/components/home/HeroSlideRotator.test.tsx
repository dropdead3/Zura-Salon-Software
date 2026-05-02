/**
 * HeroSlideRotator regression guard.
 *
 * Locks down the global decorations (rotating word + consultation notes)
 * that have now broken twice across hero refactors:
 *   (a) show_rotating_words=true + non-empty rotating_words renders
 *       <HeroRotatingWord> with the active word visible.
 *   (b) show_consultation_notes=true + non-empty notes renders <HeroNotes>.
 *   (c) Both stay hidden when their respective toggles are off.
 *
 * Notes:
 *   - We render in `isPreview` mode to suppress the auto-rotate interval —
 *     keeps the test deterministic and avoids fake-timer plumbing.
 *   - The rotator is wrapped in MemoryRouter because the slide CTAs render
 *     <Link>s.
 */
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { HeroSlideRotator } from './HeroSlideRotator';
import { DEFAULT_HERO, type HeroConfig, type HeroSlide } from '@/hooks/useSectionConfig';

function makeSlide(overrides: Partial<HeroSlide> = {}): HeroSlide {
  return {
    id: 'slide-test-1',
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
    headline_text: 'Test Headline',
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

function renderRotator(config: HeroConfig) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <HeroSlideRotator config={config} isPreview />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('HeroSlideRotator — global decorations regression guard', () => {
  it('renders <HeroRotatingWord> when show_rotating_words=true and words are non-empty', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      slides: [makeSlide()],
      show_rotating_words: true,
      rotating_words: ['Salon', 'Studio'],
    };
    const { container } = renderRotator(config);
    const word = container.querySelector('[data-hero-rotating-word]');
    expect(word).toBeTruthy();
    expect(word!.textContent).toContain('Salon');
  });

  it('hides rotating word when show_rotating_words=false', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      slides: [makeSlide()],
      show_rotating_words: false,
      rotating_words: ['Salon', 'Studio'],
    };
    const { container } = renderRotator(config);
    expect(container.querySelector('[data-hero-rotating-word]')).toBeNull();
  });

  it('hides rotating word when rotating_words array is empty', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      slides: [makeSlide()],
      show_rotating_words: true,
      rotating_words: [],
    };
    const { container } = renderRotator(config);
    expect(container.querySelector('[data-hero-rotating-word]')).toBeNull();
  });

  it('renders <HeroNotes> when show_consultation_notes=true and a line is set', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      slides: [makeSlide()],
      show_consultation_notes: true,
      consultation_note_line1: 'New clients begin with a $15 consultation',
      consultation_note_line2: 'Returning clients book directly',
    };
    const { container } = renderRotator(config);
    const notes = container.querySelector('[data-hero-notes]');
    expect(notes).toBeTruthy();
    expect(notes!.textContent).toContain('New clients begin');
    expect(notes!.textContent).toContain('Returning clients book');
  });

  it('hides notes when show_consultation_notes=false', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      slides: [makeSlide()],
      show_consultation_notes: false,
      consultation_note_line1: 'Should not render',
      consultation_note_line2: 'Nor this',
    };
    const { container } = renderRotator(config);
    expect(container.querySelector('[data-hero-notes]')).toBeNull();
  });

  it('hides notes when both consultation note lines are empty', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      slides: [makeSlide()],
      show_consultation_notes: true,
      consultation_note_line1: '',
      consultation_note_line2: '',
    };
    const { container } = renderRotator(config);
    expect(container.querySelector('[data-hero-notes]')).toBeNull();
  });
});

describe('HeroSlideRotator — rotator_mode background_only', () => {
  it('renders section-level headline (not the per-slide one) when rotator_mode is background_only', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared Headline',
      cta_new_client: 'Shared Primary',
      slides: [makeSlide({ headline_text: 'Per-Slide Headline', cta_new_client: 'Per-Slide CTA' })],
      rotator_mode: 'background_only',
    };
    const { container, getByText } = renderRotator(config);
    expect(getByText('Shared Headline')).toBeTruthy();
    expect(container.textContent).not.toContain('Per-Slide Headline');
    expect(getByText('Shared Primary')).toBeTruthy();
  });

  it('renders per-slide headline when rotator_mode is multi_slide (default)', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared Headline',
      slides: [makeSlide({ headline_text: 'Per-Slide Headline' })],
      // no rotator_mode → defaults to multi_slide
    };
    const { container, getByText } = renderRotator(config);
    expect(getByText('Per-Slide Headline')).toBeTruthy();
    expect(container.textContent).not.toContain('Shared Headline');
  });

  it('marks the foreground wrapper as shared in background_only mode (key-stable across rotation)', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared Headline',
      slides: [
        makeSlide({ id: 's1', headline_text: 'Master' }),
        makeSlide({ id: 's2', headline_text: 'Other', background_type: 'image', background_url: 'https://example.com/a.jpg' }),
      ],
      rotator_mode: 'background_only',
    };
    const { container } = renderRotator(config);
    const fg = container.querySelector('[data-hero-foreground="shared"]');
    expect(fg).toBeTruthy();
    // The non-shared marker should NOT exist in background_only mode.
    expect(container.querySelector('[data-hero-foreground="per-slide"]')).toBeNull();
  });

  it('always sources foreground from the master slide (not slides[activeIndex]) in background_only mode', () => {
    // Per-slide text_colors on a non-master slide must NOT bleed into the
    // shared foreground. Validates the "foreground source short-circuit".
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared Headline',
      slides: [
        makeSlide({ id: 's1', headline_text: 'Master Copy' }),
        makeSlide({
          id: 's2',
          headline_text: 'Should Never Render',
          cta_new_client: 'Should Never Render Either',
        }),
      ],
      rotator_mode: 'background_only',
    };
    const { container } = renderRotator(config);
    expect(container.textContent).toContain('Shared Headline');
    expect(container.textContent).not.toContain('Should Never Render');
  });

  it('sources background media from the active rotating slide (not the master slide) in background_only mode', async () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared Headline',
      slides: [
        makeSlide({
          id: 's1',
          background_type: 'image',
          background_url: 'https://example.com/master.jpg',
        }),
        makeSlide({
          id: 's2',
          background_type: 'image',
          background_url: 'https://example.com/bg-2.jpg',
        }),
        makeSlide({
          id: 's3',
          background_type: 'image',
          background_url: 'https://example.com/bg-3.jpg',
        }),
      ],
      rotator_mode: 'background_only',
      auto_rotate: true,
      slide_interval_ms: 2000,
    };

    const { container } = renderRotator(config);
    const currentImage = () => container.querySelector('img');

    expect(currentImage()?.getAttribute('src')).toBe('https://example.com/master.jpg');

    await waitFor(
      () => expect(currentImage()?.getAttribute('src')).toBe('https://example.com/bg-2.jpg'),
      { timeout: 3000 },
    );

    await waitFor(
      () => expect(currentImage()?.getAttribute('src')).toBe('https://example.com/bg-3.jpg'),
      { timeout: 3000 },
    );
  }, 7000);

  it('relabels pagination as backgrounds in background_only mode', () => {
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared',
      slides: [
        makeSlide({ id: 's1' }),
        makeSlide({ id: 's2', background_type: 'image', background_url: 'https://example.com/a.jpg' }),
      ],
      rotator_mode: 'background_only',
    };
    const { container } = renderRotator(config);
    expect(container.querySelector('[aria-label="Previous background"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Next background"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Go to background 1"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Previous slide"]')).toBeNull();
  });

  it('auto-rotates the BACKGROUND in editor preview when rotator_mode is background_only (advances index past 0)', async () => {
    // Regression: May 2026 bug — operators uploaded multiple rotating
    // backgrounds, switched to Background-Only mode, and saw the preview
    // never advance ("the rotator is broken"). Root cause: auto-rotate was
    // unconditionally suppressed in `isPreview` mode. The suppression is
    // correct for multi_slide (each slide owns editable text — rotation
    // would yank the active edit target), but wrong for background_only
    // because the foreground is shared/static.
    //
    // LIVE DB SHAPE (anchored to real-world repro, May 2026):
    //   psql> select section_payload->'rotator_mode',
    //                section_payload->'auto_rotate',
    //                section_payload->'slide_interval_ms',
    //                jsonb_array_length(section_payload->'slides')
    //         from site_settings_sections
    //         where organization_id = '<drop-dead-salons>' and section_type = 'hero';
    //   => background_only | true | 9000 | 4
    //
    // The bug ONLY repros with all four conditions:
    //   slides.length > 1  AND  auto_rotate=true  AND  rotator_mode='background_only'  AND  isPreview
    // A future "simplify the rotator" refactor that re-introduces the
    // unconditional `isPreview` suppression would still pass a test written
    // with `slides.length === 1`. Keep this test at 3 slides + auto_rotate
    // + background_only or the regression door reopens silently.
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared',
      slides: [
        // background_type: 'inherit' (the makeSlide default) avoids
        // HeroBackground's <Helmet> preload — would need HelmetProvider
        // wrapping otherwise. The auto-rotate behavior under test doesn't
        // depend on whether the background is rendered as an <img>.
        makeSlide({ id: 's1' }),
        makeSlide({ id: 's2' }),
        makeSlide({ id: 's3' }),
      ],
      rotator_mode: 'background_only',
      auto_rotate: true,
      // Floor-clamped to 2000ms by the rotator (Math.max(2000, ...)).
      // Real prod value is 9000ms; we use the floor here to keep test
      // wall-clock cheap. The clamp + the suppression branch are the
      // two pieces under test; the literal interval value is incidental.
      slide_interval_ms: 2000,
    };
    const { container } = renderRotator(config);

    // Active dot is the wide pill (w-8). Initially on background 1.
    const activeDot = () =>
      container.querySelector('[aria-label^="Go to background"].w-8');
    expect(activeDot()?.getAttribute('aria-label')).toBe('Go to background 1');

    // background_only mode must NOT show the "auto-rotate paused" hint —
    // the hint is an editing-suppression affordance, not a generic preview
    // affordance. Showing it here would lie to the operator.
    expect(container.querySelector('[data-testid="hero-rotator-paused-hint"]')).toBeNull();

    // Advance past one rotation interval. Auto-rotate should fire.
    await new Promise((r) => setTimeout(r, 2200));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Go to background 2');
  }, 5000);

  it('does NOT auto-rotate in editor preview when rotator_mode is multi_slide (suppression preserved) AND surfaces the paused-hint affordance', async () => {
    // The other half of the contract: suppressing auto-rotate in preview
    // for multi_slide mode is the correct behavior — operators editing
    // per-slide copy must not have the slide rotate out from under their
    // cursor. This guards the doctrinal split the bug fix introduced.
    //
    // Companion affordance: when we suppress, we must SAY we suppressed,
    // otherwise the preview looks broken (same UX failure mode that
    // produced the May 2026 bug report on the background_only branch).
    const config: HeroConfig = {
      ...DEFAULT_HERO,
      headline_text: 'Shared',
      slides: [
        makeSlide({ id: 's1' }),
        makeSlide({ id: 's2' }),
      ],
      // multi_slide is the default
      auto_rotate: true,
      slide_interval_ms: 2000,
    };
    const { container } = renderRotator(config);
    const activeDot = () =>
      container.querySelector('[aria-label^="Go to slide"].w-8');
    expect(activeDot()?.getAttribute('aria-label')).toBe('Go to slide 1');

    // Hint must be visible the moment the rotator mounts in preview with
    // suppression active — operators should never wait `slide_interval_ms`
    // to learn the preview won't move.
    expect(
      container.querySelector('[data-testid="hero-rotator-paused-hint"]'),
    ).not.toBeNull();

    await new Promise((r) => setTimeout(r, 2200));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Go to slide 1');
  }, 5000);
});
