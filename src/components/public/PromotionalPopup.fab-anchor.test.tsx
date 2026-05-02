/**
 * Regression guard for FAB positional stability.
 *
 * The "See Offer" FAB previously read `<html data-hero-alignment>` and shifted
 * itself to `bottom-24` whenever the active hero alignment crowded its corner.
 * Operators read that drift as a bug, not as polish — see
 * `mem://style/global-overlay-stability`. The decoupling is enforced here:
 * mutating the alignment attribute MUST NOT change the FAB's position classes.
 *
 * If a future contributor re-couples the FAB to the alignment signal, this
 * test fails fast.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PromotionalPopup } from './PromotionalPopup';

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
  fabPosition: 'bottom-right' as const,
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

async function dismissPopupToFab() {
  const root = await screen.findByTestId('promo-popup-root');
  await act(async () => {
    fireEvent.keyDown(document, { key: 'Escape' });
  });
  const closingRoot = screen.getByTestId('promo-popup-root');
  await act(async () => {
    fireEvent.animationEnd(closingRoot);
    await Promise.resolve();
  });
  return root;
}

describe('PromotionalPopup FAB — positional stability vs hero alignment', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.removeAttribute('data-hero-alignment');
  });

  it('FAB stays at bottom-6 regardless of hero alignment changes', async () => {
    render(
      <MemoryRouter>
        <PromotionalPopup surface="all-public" />
      </MemoryRouter>
    );
    await dismissPopupToFab();

    const fabButton = screen.getByLabelText(/Reopen offer/i);
    // The FAB <button> sits inside a positioned wrapper <div>; the wrapper
    // owns the bottom-6/right-6 anchor classes.
    const wrapper = fabButton.closest('div')!;
    expect(wrapper.className).toContain('bottom-6');
    expect(wrapper.className).not.toContain('bottom-24');

    // Mutate the alignment attribute the way HeroSlideRotator would as
    // slides rotate. Each mutation MUST be a no-op for the FAB.
    for (const alignment of ['right', 'left', 'center', 'right'] as const) {
      await act(async () => {
        document.documentElement.setAttribute('data-hero-alignment', alignment);
        // Give MutationObserver (if any consumer were still listening) a
        // microtask to fire and re-render.
        await Promise.resolve();
      });
      expect(wrapper.className).toContain('bottom-6');
      expect(wrapper.className).not.toContain('bottom-24');
    }
  });

  it('FAB does NOT carry a transition-[bottom] class (no animated drift)', async () => {
    render(
      <MemoryRouter>
        <PromotionalPopup surface="all-public" />
      </MemoryRouter>
    );
    await dismissPopupToFab();

    const wrapper = screen.getByLabelText(/Reopen offer/i).closest('div')!;
    // Locks out the previous "smooth-transitioned lift" that telegraphed
    // the (now-removed) drift behavior.
    expect(wrapper.className).not.toContain('transition-[bottom]');
  });
});
