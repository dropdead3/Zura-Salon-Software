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
 * This test simulates the broken environment (dashboard `<html>` carries
 * `theme-zura`, persisted website theme is `cream-lux`) and asserts the
 * Theme row's Primary chip resolves to the cream-lux primary, not Zura's.
 *
 * jsdom doesn't load Vite-processed `index.css`, so we inject the two
 * relevant `.theme-<name>` blocks manually. We only need the `--primary`
 * variable per theme — the rest of the swatch chips can be empty without
 * affecting this assertion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeAwareColorInput } from './ThemeAwareColorInput';

vi.mock('@/hooks/useWebsiteColorTheme', () => ({
  useWebsiteColorTheme: () => ({ theme: 'cream-lux', isLoading: false }),
}));
// Recent picks hook touches sessionStorage; stub to a stable empty ring so
// the test doesn't fight session state across runs.
vi.mock('@/hooks/useRecentColorPicks', () => ({
  useRecentColorPicks: () => ({ picks: [], recordPick: vi.fn() }),
}));
// Zero in-use colors so the Theme row is the only swatch source under test.
vi.mock('@/hooks/useInUseSiteColors', () => ({
  useInUseSiteColors: () => [],
}));

// HSL values pulled directly from src/index.css (cream-lux: 30 14% 45%,
// zura: 270 70% 55%). Only --primary is needed per theme.
const STYLE_ID = 'theme-aware-color-input-test-styles';

beforeEach(() => {
  // Simulate the dashboard environment: <html> carries `theme-zura`. If the
  // resolver naively reads off <html>, it'll return Zura's purple.
  document.documentElement.classList.add('theme-zura');

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .theme-zura { --primary: 270 70% 55%; }
    .theme-cream-lux { --primary: 30 14% 45%; }
  `;
  document.head.appendChild(style);
});

afterEach(() => {
  document.documentElement.classList.remove('theme-zura');
  document.getElementById(STYLE_ID)?.remove();
});

/** Convert HSL "h s% l%" → #rrggbb the same way the browser would. */
function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

describe('ThemeAwareColorInput — website theme resolution scope', () => {
  it('resolves the Primary chip from the WEBSITE theme (cream-lux), not the dashboard <html> theme (zura)', () => {
    const onChange = vi.fn();
    render(
      <ThemeAwareColorInput label="Color" value="" onChange={onChange} />,
    );

    // Open the popover so swatch chips render into the DOM.
    act(() => {
      screen.getByLabelText(/swatch picker/i).click();
    });

    // The Theme section header advertises the active website theme by name —
    // confirms the display string is sourced correctly.
    expect(screen.getByText(/Theme · Cream Lux/i)).toBeInTheDocument();

    // The Primary chip's title attribute embeds its resolved hex. Match by
    // the `(#hex)` substring rather than chip color (jsdom doesn't compute
    // the visual swatch).
    const primaryChip = screen.getByTitle(/^Primary —/i);
    const titleAttr = primaryChip.getAttribute('title') ?? '';
    const hexMatch = titleAttr.match(/#([0-9a-f]{6})/i);
    expect(hexMatch, `Primary chip title should embed a resolved hex; got: ${titleAttr}`).not.toBeNull();
    const resolvedHex = (hexMatch?.[0] ?? '').toLowerCase();

    const creamLuxHex = hslToHex(30, 14, 45); // ≈ #837569
    const zuraHex = hslToHex(270, 70, 55);   // ≈ #8233e6

    expect(
      resolvedHex,
      `Expected cream-lux primary (${creamLuxHex}); got ${resolvedHex}. ` +
        `Zura primary would be ${zuraHex} — a value matching that means the ` +
        `resolver read the dashboard <html> instead of the website theme.`,
    ).toBe(creamLuxHex);
    expect(resolvedHex).not.toBe(zuraHex);
  });
});
