/**
 * Auth-flow sentinel — a sessionStorage flag set on the login surface
 * just before navigating into the dashboard. Loader components on the
 * post-auth path read this flag and render the slate-950 AuthFlowLoader
 * (matching the login canvas) instead of the theme-driven BootLuxeLoader,
 * so the user perceives one continuous surface from /login through
 * dashboard first paint.
 *
 * The dashboard's first successful render clears the flag.
 *
 * SSR-safe — guards every window access.
 */

const KEY = 'zura.auth-flow-active';
const TTL_MS = 30_000; // 30s — long enough for any post-auth chain, short enough to self-heal

export function markAuthFlowActive(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode, quota — ignore */
  }
}

export function isAuthFlowActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearAuthFlow(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return;

    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return;

    const durationMs = Date.now() - startedAt;
    // Emit a structured event so any analytics adapter can pick it up
    // without coupling this module to a specific provider. See
    // src/lib/authFlowTelemetry.ts for the dev-only listener.
    try {
      window.dispatchEvent(
        new CustomEvent('zura:auth-flow-complete', {
          detail: {
            durationMs,
            route: window.location.pathname,
            ttlExpired: durationMs > TTL_MS,
          },
        }),
      );
    } catch {
      /* dispatch failures are non-fatal */
    }
  } catch {
    /* ignore */
  }
}
