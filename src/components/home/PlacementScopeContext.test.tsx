import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { inferPlacementScopeFromSlug, PlacementScopeProvider } from './PlacementScopeContext';
import type { PlacementScope } from '@/hooks/useTestimonials';

// --- Mocks for TestimonialSection smoke test ---------------------------------
const visibleSpy = vi.fn();

vi.mock('@/hooks/useTestimonials', () => ({
  useVisibleTestimonials: (surface: string, scope: PlacementScope) => {
    visibleSpy(surface, scope);
    return { data: [] };
  },
}));
vi.mock('@/hooks/useSectionConfig', () => ({
  useTestimonialsConfig: () => ({ data: null }),
}));
vi.mock('@/hooks/usePreviewBridge', () => ({
  useLiveOverride: <T,>(_k: string, fallback: T) => fallback,
}));
vi.mock('@/components/home/InlineEditableText', () => ({
  InlineEditableText: ({ value }: { value: string }) => <>{value}</>,
}));
vi.mock('@/components/home/SectionStyleWrapper', () => ({
  SectionStyleWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TestimonialSection } from './TestimonialSection';

describe('inferPlacementScopeFromSlug', () => {
  it.each<[string | null | undefined, PlacementScope]>([
    [undefined, 'homepage'],
    [null, 'homepage'],
    ['', 'homepage'],
    ['home', 'homepage'],
    ['about', 'homepage'],
    ['services', 'service'],
    ['menu', 'service'],
    ['pricing', 'service'],
    ['services/color', 'service'],
    ['SERVICES', 'service'],
    ['team', 'stylist'],
    ['stylists', 'stylist'],
    ['staff', 'stylist'],
    ['team/jane', 'stylist'],
    ['stylists/jane', 'stylist'],
  ])('slug %j → %s', (slug, expected) => {
    expect(inferPlacementScopeFromSlug(slug)).toBe(expected);
  });
});

describe('TestimonialSection scope wiring', () => {
  beforeEach(() => visibleSpy.mockClear());

  it.each<PlacementScope>(['homepage', 'service', 'stylist'])(
    'queries useVisibleTestimonials with scope=%s when wrapped in provider',
    (scope) => {
      render(
        <PlacementScopeProvider scope={scope}>
          <TestimonialSection />
        </PlacementScopeProvider>,
      );
      expect(visibleSpy).toHaveBeenCalledWith('general', scope);
    },
  );

  it('defaults to homepage when no provider is mounted', () => {
    render(<TestimonialSection />);
    expect(visibleSpy).toHaveBeenCalledWith('general', 'homepage');
  });
});
