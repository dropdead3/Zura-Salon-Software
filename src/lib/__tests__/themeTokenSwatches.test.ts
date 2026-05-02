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
const originalCreateElement = document.createElement.bind(document);
const PENDING_HSL = '__pendingHslColor';

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

  // jsdom rejects modern-syntax `hsl(h s% l%)` outright (style.color stays
  // empty), so the resolver's downstream getComputedStyle().color readback
  // returns ''. We work around it in two parts:
  //   (a) Override createElement to wrap the .style.color setter so any
  //       "hsl(h s% l%)" assignment is captured into a private attribute
  //       on the element.
  //   (b) Patch getComputedStyle so that when its target has the captured
  //       attribute, we synthesize the rgb() string the browser would
  //       have produced. CSS var lookups still go through the real impl.
  document.createElement = ((tag: string, opts?: ElementCreationOptions) => {
    const el = originalCreateElement(tag, opts) as HTMLElement;
    const styleObj = el.style;
    const desc = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(styleObj),
      'color',
    );
    Object.defineProperty(styleObj, 'color', {
      configurable: true,
      get() { return desc?.get?.call(this) ?? ''; },
      set(v: string) {
        const m = typeof v === 'string'
          ? v.match(/^hsl\(\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*\)$/i)
          : null;
        if (m) {
          (el as unknown as Record<string, string>)[PENDING_HSL] = v;
        }
        desc?.set?.call(this, v);
      },
    });
    return el;
  }) as typeof document.createElement;

  window.getComputedStyle = function patched(this: unknown, ...args: Parameters<typeof originalGCS>) {
    const real = originalGCS.apply(this as Window, args);
    const target = args[0] as HTMLElement;
    return new Proxy(real, {
      get(obj, prop, receiver) {
        if (prop === 'color') {
          const captured = (target as unknown as Record<string, string>)[PENDING_HSL];
          if (captured) {
            const m = captured.match(/^hsl\(\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*\)$/i);
            if (m) return hslToRgbString(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
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
  document.createElement = originalCreateElement;
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
