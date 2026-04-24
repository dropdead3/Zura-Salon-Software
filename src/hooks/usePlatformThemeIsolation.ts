import { useEffect } from 'react';

/**
 * Platform Theme Isolation
 *
 * Theme Governance canon — third pillar (cross-zone isolation).
 *
 * The platform admin layer (`/platform/*`) renders chrome from
 * `--platform-*` tokens scoped under `.platform-theme`. But raw
 * shadcn primitives still read globals like `--primary` and
 * `--muted` from `<html>`. When a user navigates from
 * `/dashboard/*` (where `useColorTheme` applied `theme-rosewood`
 * etc. to `documentElement`) into `/platform/*`, those classes
 * persist and leak the org's brand into platform UI.
 *
 * On entry to the platform zone we:
 *   - Strip every `theme-*` class from `<html>`
 *   - Strip the `dark` class (platform manages light/dark via
 *     `.platform-light` / `.platform-dark` on body)
 *   - Strip every inline non-`--platform-*` CSS var from
 *     `documentElement.style`
 *
 * On unmount we do nothing — `useColorTheme` re-applies the org's
 * theme class on its next paint when the user returns to the
 * dashboard, and `useOrgThemeReset` covers org switching.
 *
 * Mount once inside `PlatformLayoutInner`.
 */
export function usePlatformThemeIsolation() {
  useEffect(() => {
    const root = document.documentElement;

    // 1) Strip theme-* classes
    const themeClasses: string[] = [];
    root.classList.forEach((cls) => {
      if (cls.startsWith('theme-')) themeClasses.push(cls);
    });
    themeClasses.forEach((cls) => root.classList.remove(cls));

    // 2) Strip the org-side dark class (platform owns its mode)
    root.classList.remove('dark');

    // 3) Strip inline non-platform CSS vars
    const style = root.style;
    const propsToRemove: string[] = [];
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (prop.startsWith('--') && !prop.startsWith('--platform-')) {
        propsToRemove.push(prop);
      }
    }
    propsToRemove.forEach((prop) => style.removeProperty(prop));
  }, []);
}
