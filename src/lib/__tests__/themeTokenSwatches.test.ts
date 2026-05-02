/**
 * themeTokenSwatches — resolution scope regression.
 *
 * Pairs with ThemeAwareColorInput.test.tsx. The component test asserts the
 * displayed theme name; this test asserts the actual hex resolution path:
 * given a website theme class, the resolver must read CSS variables under
 * THAT class — not whatever lives on `<html>`.
 *
 * jsdom doesn't compute `hsl(...)` strings to RGB, so we monkey-patch
 * `getComputedStyle` to do the conversion in JS for the sandbox element
 * only. This isolates the test to "did the resolver pick the right scope?"
 * without coupling it to a browser color engine.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readThemeTokenSwatches } from '../themeTokenSwatches';

const STYLE_ID = 'theme-token-swatches-test-styles';

function hslToRgbString(h: number, s: number, l: number): string {
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
  const to = (n: number) => Math.round((n + m) * 255);
  return `rgb(${to(r)}, ${to(g)}, ${to(b)})`;
}

const originalGCS = window.getComputedStyle;

beforeEach(() => {
  // Inject just the --primary CSS var per theme — enough to exercise the
  // resolver's scope behavior without dragging in the full index.css.
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .theme-zura { --primary: 270 70% 55%; }
    .theme-cream-lux { --primary: 30 14% 45%; }
  `;
  document.head.appendChild(style);

  // Patch getComputedStyle to convert `hsl(h s% l%)` color strings (set by
  // computedColorToHex on its sandbox div) into rgb() that jsdom returns
  // verbatim. We only intercept the .color readback — CSS var lookups go
  // through the original implementation.
  window.getComputedStyle = function patched(this: unknown, ...args: Parameters<typeof originalGCS>) {
    const real = originalGCS.apply(this as Window, args);
    const target = args[0] as Element;
    return new Proxy(real, {
      get(obj, prop, receiver) {
        if (prop === 'color') {
          const inline = (target as HTMLElement).style?.color ?? '';
          const m = inline.match(/^hsl\(\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*\)$/i);
          if (m) {
            return hslToRgbString(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
          }
        }
        return Reflect.get(obj, prop, receiver);
      },
    });
  } as typeof originalGCS;
});

afterEach(() => {
  document.getElementById(STYLE_ID)?.remove();
  window.getComputedStyle = originalGCS;
  document.documentElement.className = '';
});

describe('readThemeTokenSwatches — resolution scope', () => {
  it('resolves Primary to the cream-lux hex when explicitly scoped to theme-cream-lux, even with theme-zura on <html>', () => {
    // Reproduce the dashboard environment: <html> has the dashboard theme.
    // Without an explicit themeClass arg, this would surface Zura's purple.
    document.documentElement.classList.add('theme-zura');

    const swatches = readThemeTokenSwatches('theme-cream-lux');
    const primary = swatches.find((s) => s.key === 'primary');
    expect(primary?.hex).toBe('#847569'); // hsl(30 14% 45%) → warm taupe

    // Sanity: the same call with the wrong scope returns Zura's purple,
    // confirming the test infra distinguishes the two outcomes.
    const wrongScope = readThemeTokenSwatches('theme-zura');
    expect(wrongScope.find((s) => s.key === 'primary')?.hex).toBe('#a73be6');
  });

  it('falls back to <html> classes when no themeClass arg is provided (back-compat for non-editor callers)', () => {
    document.documentElement.classList.add('theme-cream-lux');

    const swatches = readThemeTokenSwatches();
    expect(swatches.find((s) => s.key === 'primary')?.hex).toBe('#847569');
  });
});
