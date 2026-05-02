/**
 * Regression test for the "popup snaps in instead of sliding up" bug.
 *
 * The visible bug is invisible in jsdom because CSS animations don't run —
 * but the mechanical contract that drives the visible outcome is "the
 * canonical reset event must call `replayPopupMount` (i.e. bump the React
 * `key` on the popup root)". If a new appearance variant is added without
 * a `key={animationNonce}`, the visual bug returns; if the reset path
 * stops calling `replayPopupMount`, the bug returns. This test guards
 * the second failure mode.
 *
 * Approach: render the popup in editor-preview mode, dispatch the
 * canonical reset CustomEvent, and assert that the `data-animation-key`
 * on the popup root changes. That data attribute mirrors the React `key`,
 * so a change there proves the root remounted — which is what replays
 * `animate-in slide-in-from-*`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PromotionalPopup } from './PromotionalPopup';
import { PROMO_POPUP_PREVIEW_RESET_EVENT } from '@/lib/promoPopupPreviewReset';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// Editor preview short-circuits frequency caps + forces immediate trigger,
// which is the path the operator's "Restart popup preview" button drives.
vi.mock('@/hooks/useIsEditorPreview', () => ({
  useIsEditorPreview: () => true,
}));

vi.mock('@/hooks/useSettingsOrgId', () => ({
  useSettingsOrgId: () => 'test-org',
}));

vi.mock('@/hooks/useOrgPath', () => ({
  useOrgPath: () => (path: string) => path,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

const baseCfg = {
  enabled: true,
  appearance: 'corner-card' as const,
  trigger: 'immediate' as const,
  triggerValueMs: 0,
  showOn: ['all-public'] as const,
  headline: 'Test Offer',
  body: 'Body',
  ctaLabel: 'Claim',
  offerCode: 'TEST',
  autoMinimizeMs: 15000,
  showFabAfterDismiss: true,
  frequencyCapDays: 0,
  imageUrl: null,
  imageTreatment: 'auto',
  eyebrow: null,
  eyebrowIcon: null,
  accentColor: null,
};

vi.mock('@/hooks/usePromotionalPopup', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '@/hooks/usePromotionalPopup'
  );
  return {
    ...actual,
    usePromotionalPopup: () => ({ data: baseCfg }),
    isPopupActive: () => true,
  };
});

describe('PromotionalPopup — reset bumps the React key', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('changes data-animation-key after the canonical reset event', async () => {
    render(
      <MemoryRouter>
        <PromotionalPopup surface="all-public" />
      </MemoryRouter>
    );

    // Editor preview + immediate trigger → root mounts on first render.
    const initialRoot = await screen.findByTestId('promo-popup-root');
    const initialKey = initialRoot.getAttribute('data-animation-key');
    expect(initialKey).not.toBeNull();

    // Operator clicks "Restart popup preview" → editor dispatches the
    // canonical reset event. The popup MUST remount its root so Tailwind's
    // `animate-in slide-in-from-*` replays.
    await act(async () => {
      window.dispatchEvent(new CustomEvent(PROMO_POPUP_PREVIEW_RESET_EVENT));
    });

    const nextRoot = await screen.findByTestId('promo-popup-root');
    const nextKey = nextRoot.getAttribute('data-animation-key');
    expect(nextKey).not.toBe(initialKey);
  });

  it('also bumps the key when the iframe-bridge postMessage is received', async () => {
    render(
      <MemoryRouter>
        <PromotionalPopup surface="all-public" />
      </MemoryRouter>
    );

    const initialRoot = await screen.findByTestId('promo-popup-root');
    const initialKey = initialRoot.getAttribute('data-animation-key');

    // LivePreviewPanel forwards the parent CustomEvent into the preview
    // iframe as a postMessage — this is the path the bug actually hit.
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'PREVIEW_PROMO_POPUP_RESET' },
        })
      );
    });

    const nextRoot = await screen.findByTestId('promo-popup-root');
    expect(nextRoot.getAttribute('data-animation-key')).not.toBe(initialKey);
  });
});
