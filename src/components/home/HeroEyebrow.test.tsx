/**
 * HeroEyebrow — preview-vs-live parity guard.
 *
 * Three contracts asserted here:
 *   1. show=false OR empty text returns null — the operator's toggle and
 *      the absence of copy both must short-circuit identically.
 *   2. The eyebrow contract classes (`text-xs uppercase tracking-[0.2em]
 *      font-display section-eyebrow`) are present on the rendered node so
 *      a future variant cannot accidentally drop the styling.
 *   3. The `data-hero-eyebrow` marker is present on the rendered node so
 *      preview-as-QA tooling can locate it without coupling to internals.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeroEyebrow } from './HeroEyebrow';

describe('HeroEyebrow', () => {
  it('returns null when show=false', () => {
    const { container } = render(<HeroEyebrow show={false} text="Test" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when text is empty', () => {
    const { container } = render(<HeroEyebrow show={true} text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when text is null', () => {
    const { container } = render(<HeroEyebrow show={true} text={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the eyebrow contract classes in static mode', () => {
    const { container } = render(<HeroEyebrow show={true} text="LUXURY" />);
    const node = container.querySelector('[data-hero-eyebrow]');
    expect(node).toBeTruthy();
    // Eyebrow component owns the typography classes — assert they survive
    // through the wrapper.
    expect(node!.innerHTML).toContain('LUXURY');
    const inner = node!.querySelector('.section-eyebrow');
    expect(inner).toBeTruthy();
    expect(inner!.className).toContain('uppercase');
    expect(inner!.className).toContain('tracking-[0.2em]');
    expect(inner!.className).toContain('font-display');
  });

  it('renders the eyebrow contract classes in editable mode', () => {
    const { container } = render(
      <HeroEyebrow show={true} text="LUXURY" editable fieldPath="eyebrow" />,
    );
    const node = container.querySelector('[data-hero-eyebrow]');
    expect(node).toBeTruthy();
    expect(node!.className).toContain('uppercase');
    expect(node!.className).toContain('tracking-[0.2em]');
    expect(node!.className).toContain('font-display');
    expect(node!.className).toContain('section-eyebrow');
  });

  it('applies the toneClass slot', () => {
    const { container } = render(
      <HeroEyebrow show={true} text="LUXURY" toneClass="text-white/70" />,
    );
    const node = container.querySelector('[data-hero-eyebrow]');
    expect(node!.innerHTML).toContain('text-white/70');
  });
});
