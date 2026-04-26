import { useEffect } from 'react';
import { isAuthFlowActive, clearAuthFlow } from '@/lib/authFlowSentinel';

/**
 * usePostLoginFirstPaint — generalizes the post-login handoff guard.
 *
 * Pass the `isLoading` flags of every query a page needs before showing
 * real content. While the auth-flow sentinel is active AND any flag is
 * still true, the hook returns `true` — the page should short-circuit to
 * <AuthFlowLoader /> so the user sees one continuous slate-950 canvas
 * from /login through the page's first real paint.
 *
 * As soon as every flag resolves false, the hook clears the sentinel,
 * so subsequent in-app navigations resume using the operator-branded
 * loaders (DashboardLoader / BootLuxeLoader).
 *
 * Doctrine: NEVER call `clearAuthFlow()` directly from a page — always
 * route the responsibility through this hook so the contract stays in
 * one place. See mem://style/loader-unification.md.
 *
 * Usage:
 *   const showHandoff = usePostLoginFirstPaint(layoutLoading, accessLoading);
 *   if (showHandoff) return <AuthFlowLoader />;
 */
export function usePostLoginFirstPaint(...loadingFlags: boolean[]): boolean {
  const isFirstPaintLoading = loadingFlags.some(Boolean);

  useEffect(() => {
    if (!isFirstPaintLoading) clearAuthFlow();
  }, [isFirstPaintLoading]);

  return isFirstPaintLoading && isAuthFlowActive();
}
