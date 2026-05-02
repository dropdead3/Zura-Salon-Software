/**
 * Regression test for the "popup hard-cuts to FAB instead of animating
 * closed" bug. jsdom can't run the CSS animation itself, but it CAN
 * dispatch the `animationend` event — that's the entire mechanical
 * contract `usePresenceLifecycle` enforces:
 *
 *   1. close handler fires → popup MUST stay mounted with phase=closing
 *   2. animationend fires on the ROOT → popup unmounts, FAB appears
 *
 * If a future contributor adds a new variant and forgets `onAnimationEnd`,
 * step 2 never fires → popup stays mounted forever in `closing` phase
 * (visible bug: popup freezes mid-close). This test catches that.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PromotionalPopup } from './PromotionalPopup';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

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
  supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
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

describe('PromotionalPopup — close path waits for animationend', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('Esc key starts the close animation but keeps the popup mounted until animationend', async () => {
    renderWithProviders(<PromotionalPopup surface="all-public" />);

    const root = await screen.findByTestId('promo-popup-root');
    expect(root.getAttribute('data-popup-phase')).toBe('entering');
    // No FAB yet — popup is the active surface.
    expect(screen.queryByLabelText(/Reopen offer/i)).toBeNull();

    // Operator hits Esc → close path begins.
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    // CONTRACT 1: popup MUST still be mounted, now in `closing` phase.
    // If this assertion fails, the bug is back: setOpen(false) ran
    // synchronously and the exit animation never got to play.
    const closingRoot = screen.getByTestId('promo-popup-root');
    expect(closingRoot.getAttribute('data-popup-phase')).toBe('closing');
    expect(screen.queryByLabelText(/Reopen offer/i)).toBeNull();

    // CONTRACT 2: fire animationend on the ROOT (target === currentTarget).
    // This is the exact event the CSS exit animation would dispatch.
    await act(async () => {
      fireEvent.animationEnd(closingRoot);
      // onExit is queued via microtask — let it flush.
      await Promise.resolve();
    });

    // Popup is unmounted; FAB has taken over.
    expect(screen.queryByTestId('promo-popup-root')).toBeNull();
    expect(screen.getByLabelText(/Reopen offer/i)).toBeTruthy();
  });

  it('ignores animationend bubbling up from a child element', async () => {
    render(
      <MemoryRouter>
        <PromotionalPopup surface="all-public" />
      </MemoryRouter>
    );

    const root = await screen.findByTestId('promo-popup-root');

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    const closingRoot = screen.getByTestId('promo-popup-root');
    expect(closingRoot.getAttribute('data-popup-phase')).toBe('closing');

    // Synthetic animationend from a CHILD (e.g. countdown bar pulse).
    // Without the `target !== currentTarget` guard, this would
    // prematurely unmount the popup mid-close.
    const child = closingRoot.querySelector('button');
    expect(child).toBeTruthy();
    await act(async () => {
      fireEvent.animationEnd(child!);
      await Promise.resolve();
    });

    // Popup MUST still be mounted in closing phase — only the root's
    // own animationend should finalize.
    expect(screen.getByTestId('promo-popup-root')).toBeTruthy();
    expect(screen.getByTestId('promo-popup-root').getAttribute('data-popup-phase')).toBe(
      'closing'
    );
  });
});
