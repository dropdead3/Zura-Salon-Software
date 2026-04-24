import { useEffect, useRef } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const CLEAR_CUSTOM_THEME_EVENT = 'dashboard-theme:clear-custom-overrides';

/**
 * Strip every inline CSS custom property on documentElement that isn't
 * a platform token. Platform tokens (`--platform-*`) carry the chrome
 * for the platform admin layer and must survive org switches.
 */
function clearOrgInlineVars() {
  const style = document.documentElement.style;
  const propsToRemove: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--') && !prop.startsWith('--platform-')) {
      propsToRemove.push(prop);
    }
  }
  propsToRemove.forEach(prop => style.removeProperty(prop));
}

/**
 * Strip every `theme-*` class from <html>. The next paint will rehydrate
 * from the new org's `site_settings.org_color_theme` via `useColorTheme`.
 */
function clearThemeClasses() {
  const root = document.documentElement;
  const toRemove: string[] = [];
  root.classList.forEach((cls) => {
    if (cls.startsWith('theme-')) {
      toRemove.push(cls);
    }
  });
  toRemove.forEach(cls => root.classList.remove(cls));
}

/**
 * Theme Governance — clean DOM on org switch.
 *
 * Without this, when a user moves between organizations in the same
 * browser session, the previous org's brand vars and `theme-*` class
 * linger until React re-renders and the new org's `site_settings`
 * rows resolve. This hook fires synchronously on org id change so
 * the next paint is either the new org's brand or the bundled default
 * — never a flash of the previous tenant's identity.
 *
 * Mount once at the dashboard shell (DashboardLayout). It is a no-op
 * for the initial mount (so we don't strip the boot-time inline vars
 * applied by the pre-paint script), and only acts on subsequent org
 * id transitions.
 */
export function useOrgThemeReset() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const previousOrgIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const previous = previousOrgIdRef.current;
    previousOrgIdRef.current = orgId;

    // First mount: don't touch the DOM — boot script may have prepainted.
    if (previous === undefined) return;

    // No actual transition: same org id (or both unset).
    if (previous === orgId) return;

    clearOrgInlineVars();
    clearThemeClasses();
    // Notify ThemeInitializer / useCustomTheme listeners that any cached
    // applied-vars they tracked are gone so they don't try to remove them
    // again on the next paint.
    window.dispatchEvent(new CustomEvent(CLEAR_CUSTOM_THEME_EVENT));
  }, [orgId]);
}
