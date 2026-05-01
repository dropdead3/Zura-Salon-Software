/**
 * HeroRotatingWord — preview-vs-live parity guard.
 *
 * Contracts asserted:
 *   1. show=false returns null (operator toggle).
 *   2. Empty words array returns null (no decoration to render).
 *   3. Index out of range wraps via modulo (defensive — slides shrink mid-cycle).
 *   4. Renders the canonical `h-[1.15em]` wrapper to prevent headline reflow.
 *   5. Active word text appears in the rendered output.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeroRotatingWord } from './HeroRotatingWord';

describe('HeroRotatingWord', () => {
  it('returns null when show=false', () => {
    const { container } = render(
      <HeroRotatingWord show={false} words={['Alpha', 'Beta']} index={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when words array is empty', () => {
    const { container } = render(
      <HeroRotatingWord show={true} words={[]} index={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the active word', () => {
    const { container } = render(
      <HeroRotatingWord show={true} words={['Alpha', 'Beta']} index={1} />,
    );
    const node = container.querySelector('[data-hero-rotating-word]');
    expect(node).toBeTruthy();
    expect(node!.textContent).toContain('Beta');
  });

  it('wraps out-of-range index via modulo', () => {
    const { container } = render(
      <HeroRotatingWord show={true} words={['Alpha', 'Beta']} index={5} />,
    );
    expect(container.textContent).toContain('Beta');
  });

  it('applies the no-reflow wrapper height class', () => {
    const { container } = render(
      <HeroRotatingWord show={true} words={['Alpha']} index={0} />,
    );
    const node = container.querySelector('[data-hero-rotating-word]');
    expect(node!.className).toContain('h-[1.15em]');
    expect(node!.className).toContain('overflow-hidden');
  });
});
