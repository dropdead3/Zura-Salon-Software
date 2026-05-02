/**
 * B4 regression lock — the FAB dismiss button must be reachable on every
 * viewport. The pre-fix class string carried `hidden sm:flex`, which made
 * the X button invisible on phones (the exact viewport where the persistent
 * reminder is most annoying). This test asserts the class never reverts.
 *
 * Doctrine anchor: `mem://style/container-aware-responsiveness` — visibility
 * decisions belong to the component, not the viewport.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromoFab } from './PromoFab';

function renderFab(overrides: Partial<React.ComponentProps<typeof PromoFab>> = {}) {
  return render(
    <PromoFab
      headline="See Offer"
      position="bottom-right"
      accent="#000000"
      accentFg="#ffffff"
      pulsing={false}
      onOpen={() => {}}
      onDismiss={() => {}}
      {...overrides}
    />,
  );
}

describe('PromoFab — dismiss button visibility (B4)', () => {
  it('renders the dismiss button in the DOM regardless of viewport', () => {
    renderFab();
    const btn = screen.getByRole('button', { name: /dismiss offer reminder/i });
    expect(btn).toBeInTheDocument();
  });

  it('dismiss button class never reintroduces `hidden sm:flex`', () => {
    renderFab();
    const btn = screen.getByRole('button', { name: /dismiss offer reminder/i });
    const cls = btn.className;
    // The Tailwind responsive-hide pair is the exact regression vector.
    // Either token alone (without the `flex` reset) would also hide the
    // button on mobile, so we ban both independently.
    expect(cls).not.toMatch(/\bhidden\b/);
    expect(cls).not.toMatch(/\bsm:flex\b/);
    // Sanity: the button should declare an unconditional `flex` so it
    // actually lays out its X icon.
    expect(cls).toMatch(/\bflex\b/);
  });

  it('mirrors visibility for left-anchored position', () => {
    renderFab({ position: 'bottom-left' });
    const btn = screen.getByRole('button', { name: /dismiss offer reminder/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).not.toMatch(/\bhidden\b/);
  });
});
