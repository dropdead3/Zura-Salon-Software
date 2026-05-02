/**
 * ThemeAwareColorInput — website-theme resolution scope regression.
 *
 * The picker lives inside the dashboard, but its swatches must represent the
 * PUBLIC SITE's palette (cream-lux by default), not the dashboard's
 * <html> theme (`theme-zura`). Before April 2026 the resolver read directly
 * off <html> and surfaced Zura's purple as "Primary" while the operator's
 * Cream Lux site rendered with warm taupe — a cohesion-breaking mismatch
 * that re-introduced exactly the drift the picker was designed to prevent.
 *
 * What this test locks in (component layer):
 *   1. The Theme section header advertises the WEBSITE theme name
 *      ("Theme · Cream Lux"), proving `useWebsiteColorTheme` is the source
 *      of the resolution scope — not the dashboard `<html>` class. If the
 *      resolver ever regresses to reading `<html>`, the header would say
 *      "Theme · Zura" under this test setup and the assertion would fail.
 *   2. The `editor-theme-preview` event (dispatched by SiteDesignPanel on
 *      tile click) instantly swaps the displayed name — proving the picker
 *      stays in sync with the iframe's instant theme swap channel.
 *
 * Hex resolution itself is covered by the lower-level lib test
 * (`themeTokenSwatches.test.ts`) — jsdom doesn't compute `hsl(...)` color
 * strings to RGB, so any chip-color assertion here would be testing jsdom
 * rather than our code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeAwareColorInput } from './ThemeAwareColorInput';

vi.mock('@/hooks/useWebsiteColorTheme', () => ({
  useWebsiteColorTheme: () => ({ theme: 'cream-lux', isLoading: false }),
}));
vi.mock('@/hooks/useRecentColorPicks', () => ({
  useRecentColorPicks: () => ({ picks: [], recordPick: vi.fn() }),
}));
vi.mock('@/hooks/useInUseSiteColors', () => ({
  useInUseSiteColors: () => [],
}));
// Mock the resolver so the test controls the website-theme hex deterministically.
// Real resolution requires getComputedStyle -> RGB parsing which jsdom doesn't do.
vi.mock('@/lib/themeTokenSwatches', async () => {
  const actual = await vi.importActual<typeof import('@/lib/themeTokenSwatches')>(
    '@/lib/themeTokenSwatches',
  );
  return {
    ...actual,
    readThemeTokenSwatches: () => [
      {
        key: 'primary',
        label: 'Primary',
        hint: 'CTAs and accents',
        cssVar: 'hsl(var(--primary))',
        hex: '#837363', // cream-lux primary (warm taupe)
      },
    ],
    subscribeToThemeChanges: () => () => {},
  };
});

beforeEach(() => {
  // Simulate the dashboard environment: <html> carries `theme-zura`. This
  // is what made the original bug invisible — both classes existed; the
  // resolver picked the wrong one.
  document.documentElement.classList.add('theme-zura');
});

afterEach(() => {
  document.documentElement.classList.remove('theme-zura');
});

describe('ThemeAwareColorInput — website theme resolution scope', () => {
  it('shows the WEBSITE theme name in the Theme row header (not the dashboard <html> theme)', () => {
    render(
      <ThemeAwareColorInput label="Color" value="" onChange={vi.fn()} />,
    );

    act(() => {
      screen.getByLabelText(/swatch picker/i).click();
    });

    // Cream Lux is the website theme; Zura is the dashboard <html> theme.
    // Header must show Cream Lux — proves the picker is reading
    // useWebsiteColorTheme, not document.documentElement.
    expect(screen.getByText(/Theme · Cream Lux/i)).toBeInTheDocument();
    expect(screen.queryByText(/Theme · Zura$/i)).toBeNull();
  });

  it('repaints the Theme row name when the editor-theme-preview event fires (instant iframe-sync channel)', () => {
    render(
      <ThemeAwareColorInput label="Color" value="" onChange={vi.fn()} />,
    );

    act(() => {
      screen.getByLabelText(/swatch picker/i).click();
    });
    expect(screen.getByText(/Theme · Cream Lux/i)).toBeInTheDocument();

    // Operator clicks the Marine tile in Site Design → SiteDesignPanel
    // dispatches `editor-theme-preview` with theme-marine. Picker should
    // pick that up the same tick (before the site_settings refetch lands)
    // so its chips/header match what the iframe is now showing.
    act(() => {
      window.dispatchEvent(
        new CustomEvent('editor-theme-preview', {
          detail: { themeClass: 'theme-marine' },
        }),
      );
    });
    expect(screen.getByText(/Theme · Marine/i)).toBeInTheDocument();
  });
});
