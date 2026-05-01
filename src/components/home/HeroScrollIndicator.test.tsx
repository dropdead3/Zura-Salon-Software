/**
 * HeroScrollIndicator regression guard.
 *
 * Three contracts asserted here, one per past or anticipated bug class:
 *   1. show=false MUST render nothing — the toggle is the operator's only
 *      lever to hide the cue; if it returns a hidden node, screen readers
 *      and layout flows break.
 *   2. Empty/whitespace text falls back to "Scroll" — operators routinely
 *      clear the field expecting the default; an empty button is a UX dead
 *      zone.
 *   3. onMedia=true switches to white-ish classes — the May 2026 missing-
 *      indicator bug also masked an over-dark text color over media. This
 *      guarantees the white-ish drop-shadow path is exercised.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeroScrollIndicator } from './HeroScrollIndicator';

describe('HeroScrollIndicator', () => {
  it('returns null when show=false', () => {
    const { container } = render(
      <HeroScrollIndicator show={false} onMedia={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('falls back to "Scroll" when text is empty string', () => {
    const { getByRole } = render(
      <HeroScrollIndicator show={true} text="" onMedia={false} />,
    );
    expect(getByRole('button').textContent).toContain('Scroll');
  });

  it('falls back to "Scroll" when text is whitespace only', () => {
    const { getByRole } = render(
      <HeroScrollIndicator show={true} text="   " onMedia={false} />,
    );
    expect(getByRole('button').textContent).toContain('Scroll');
  });

  it('falls back to "Scroll" when text is undefined', () => {
    const { getByRole } = render(
      <HeroScrollIndicator show={true} onMedia={false} />,
    );
    expect(getByRole('button').textContent).toContain('Scroll');
  });

  it('renders custom text when provided', () => {
    const { getByRole } = render(
      <HeroScrollIndicator show={true} text="Discover" onMedia={false} />,
    );
    expect(getByRole('button').textContent).toContain('Discover');
  });

  it('applies white-ish classes when onMedia=true', () => {
    const { getByRole } = render(
      <HeroScrollIndicator show={true} onMedia={true} />,
    );
    const cls = getByRole('button').className;
    expect(cls).toContain('text-white');
    expect(cls).toContain('drop-shadow');
  });

  it('applies muted-foreground classes when onMedia=false', () => {
    const { getByRole } = render(
      <HeroScrollIndicator show={true} onMedia={false} />,
    );
    const cls = getByRole('button').className;
    expect(cls).toContain('text-foreground');
    expect(cls).not.toContain('text-white');
  });
});
