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
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    <MemoryRouter>
      <HeroSlideRotator config={config} isPreview />
    </MemoryRouter>,
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
});
