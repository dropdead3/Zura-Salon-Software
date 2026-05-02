/**
 * Locks the parallax-binding contract for `useHeroScrollAnimation`:
 *
 *   - When the hero is rendered inside a `HeroParallaxScrollProvider`
 *     with a non-null driver ref, the hook MUST bind `useScroll` to that
 *     driver — otherwise the hero's animations stop firing while the
 *     sticky shell is pinned (the bug the user reported).
 *   - When no provider is present (flat / non-parallax sites), the hook
 *     falls back to the local section ref it was given. This preserves
 *     unchanged behavior for every existing tenant.
 *
 * We spy on framer-motion's `useScroll` export (same technique as
 * `HeroSlideRotator.scroll-fx.test.tsx`) to capture exactly which target
 * was bound under each condition.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';

// Capture every useScroll call BEFORE importing anything that pulls
// framer-motion transitively.
const useScrollCalls: Array<{ target?: { current: HTMLElement | null } }> = [];

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useScroll: (opts: { target?: { current: HTMLElement | null } }) => {
      useScrollCalls.push(opts);
      return actual.useScroll(opts as Parameters<typeof actual.useScroll>[0]);
    },
  };
});

// Imports must come AFTER the mock declaration.
import { useHeroScrollAnimation } from '@/hooks/useHeroScrollAnimation';
import { HeroParallaxScrollProvider } from './HeroParallaxScrollContext';

function HeroProbe({ id }: { id: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  useHeroScrollAnimation({ target: sectionRef, enabled: true });
  return <section ref={sectionRef} data-testid={id} />;
}

describe('useHeroScrollAnimation · parallax driver binding', () => {
  beforeEach(() => {
    useScrollCalls.length = 0;
  });

  it('falls back to the local section ref when no parallax provider is present', () => {
    const { container } = render(<HeroProbe id="flat" />);
    expect(useScrollCalls.length).toBeGreaterThan(0);
    const target = useScrollCalls[0]?.target;
    expect(target).toBeDefined();
    // Resolves to the rendered <section>.
    expect(target!.current).toBe(container.querySelector('section'));
  });

  it('binds to the driver ref when wrapped in HeroParallaxScrollProvider', () => {
    function Wrapper() {
      const driverRef = useRef<HTMLDivElement>(null);
      return (
        <HeroParallaxScrollProvider value={driverRef}>
          <div ref={driverRef} data-testid="driver">
            <HeroProbe id="parallax" />
          </div>
        </HeroParallaxScrollProvider>
      );
    }
    const { getByTestId } = render(<Wrapper />);
    expect(useScrollCalls.length).toBeGreaterThan(0);
    const target = useScrollCalls[0]?.target;
    expect(target).toBeDefined();
    // Should be the DRIVER <div>, not the inner <section>.
    expect(target!.current).toBe(getByTestId('driver'));
    expect((target!.current as HTMLElement).tagName).toBe('DIV');
  });

  it('falls back when provider value is explicitly null (parallax disabled)', () => {
    function Wrapper() {
      return (
        <HeroParallaxScrollProvider value={null}>
          <HeroProbe id="off" />
        </HeroParallaxScrollProvider>
      );
    }
    const { container } = render(<Wrapper />);
    expect(useScrollCalls.length).toBeGreaterThan(0);
    const target = useScrollCalls[0]?.target;
    expect(target!.current).toBe(container.querySelector('section'));
  });
});
