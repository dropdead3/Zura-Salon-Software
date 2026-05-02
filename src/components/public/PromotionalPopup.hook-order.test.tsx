/**
 * Hook-order regression lock for PromotionalPopup.
 *
 * In May 2026 a Wave 1 enhancement added `useRef` + `useEffect` AFTER two
 * early `return null` branches gated on `lifecycle.active` and `cfg`. When
 * the resolved config flipped from null → loaded, React threw
 *   "Rendered more hooks than during the previous render."
 * crashing the entire draft preview behind the global error boundary.
 *
 * This spec renders <PromotionalPopup> with cfg=null first, then re-renders
 * with a resolved cfg, and asserts no React hook-order error fires. Any
 * future contributor who reintroduces a hook after the early returns will
 * see this test fail before shipping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PromotionalPopup } from './PromotionalPopup';

vi.mock('@/hooks/useSettingsOrgId', () => ({
  useSettingsOrgId: () => 'org-test',
}));
vi.mock('@/hooks/useIsEditorPreview', () => ({
  useIsEditorPreview: () => false,
}));
vi.mock('@/hooks/useOrgPath', () => ({
  useOrgPath: () => (p: string) => p,
}));

const resolvedHook = vi.hoisted(() => ({ current: { resolved: null, wrapper: null, variantKey: null } as any }));
vi.mock('@/hooks/useResolvedPromotionalPopup', () => ({
  useResolvedPromotionalPopup: () => resolvedHook.current,
}));

vi.mock('./promo/usePromoLifecycle', () => ({
  usePromoLifecycle: ({ cfg }: { cfg: any }) => ({
    active: !!cfg,
    open: !!cfg,
    onBookingSurface: false,
    showFab: false,
    pulseFab: false,
    isClosing: false,
    isHovered: false,
    setIsHovered: () => {},
    animationNonce: 0,
    popupPhase: 'enter',
    autoMinimizeSeconds: null,
    secondsLeft: 0,
    code: cfg?.offerCode ?? '',
    beginExit: () => {},
    onAnimationEnd: () => {},
    reopenFromFab: () => {},
    dismissFab: () => {},
  }),
  recordImpression: vi.fn(() => Promise.resolve()),
  recordResponse: vi.fn(() => Promise.resolve()),
  writeDismissal: vi.fn(),
  markSessionDismissed: vi.fn(),
}));

vi.mock('./promo/PromoModal', () => ({ PromoModal: () => <div data-testid="promo-modal" /> }));
vi.mock('./promo/PromoBanner', () => ({ PromoBanner: () => null }));
vi.mock('./promo/PromoCornerCard', () => ({ PromoCornerCard: () => null }));
vi.mock('./promo/PromoFab', () => ({ PromoFab: () => null }));

describe('PromotionalPopup — hook-order stability', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resolvedHook.current = { resolved: null, wrapper: null, variantKey: null };
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('does not throw a hooks-order error when cfg flips null → resolved', () => {
    const { rerender, getByTestId } = render(
      <MemoryRouter>
        <PromotionalPopup />
      </MemoryRouter>,
    );

    // Now flip cfg to a resolved value (simulates the async config load).
    resolvedHook.current = {
      resolved: {
        appearance: 'modal',
        offerCode: 'WELCOME',
        accentColor: 'hsl(0 0% 0%)',
        fabPosition: 'bottom-right',
        headline: 'Hi',
        acceptDestination: 'booking',
      },
      wrapper: { offerCode: 'WELCOME' },
      variantKey: null,
    };

    rerender(
      <MemoryRouter>
        <PromotionalPopup />
      </MemoryRouter>,
    );

    expect(getByTestId('promo-modal')).toBeInTheDocument();

    const hookOrderError = errorSpy.mock.calls.find((args) =>
      args.some((a) => typeof a === 'string' && /Rendered more hooks|Rendered fewer hooks/i.test(a)),
    );
    expect(hookOrderError).toBeUndefined();
  });
});
