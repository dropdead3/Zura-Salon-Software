import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Store scroll positions for dashboard routes (keyed by pathname + search)
const scrollPositions = new Map<string, number>();

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const prevKey = useRef(key);
  const prevPathname = useRef(pathname);
  const isNavigatingWithinDashboard = useRef(false);

  // Disable browser's automatic scroll restoration
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Use useLayoutEffect to capture scroll position BEFORE React updates the DOM
  useLayoutEffect(() => {
    const wasDashboard = prevPathname.current.startsWith('/dashboard');
    const isDashboard = pathname.startsWith('/dashboard');
    const samePathname = prevPathname.current === pathname;

    // Save the scroll position of the previous route before anything changes
    if (wasDashboard && prevKey.current !== key) {
      scrollPositions.set(prevKey.current, window.scrollY);
    }

    // Only treat as "within dashboard" navigation (with restore) when the
    // pathname itself changed. Search-only changes (in-place view swaps like
    // Settings ?category=… or hubs that flip a query param) should always
    // scroll to top so the new view starts at its header.
    isNavigatingWithinDashboard.current = wasDashboard && isDashboard && !samePathname;

    if (isNavigatingWithinDashboard.current) {
      // Navigating within dashboard - do nothing, let useEffect handle restoration
    } else {
      // Navigating to/from non-dashboard, OR a search-only change → scroll to top
      window.scrollTo(0, 0);
    }

    prevPathname.current = pathname;
    prevKey.current = key;
  }, [pathname, search, key]);

  // Use useEffect to restore scroll position after the DOM has been painted
  useEffect(() => {
    if (isNavigatingWithinDashboard.current) {
      // Small delay to ensure the new page content has rendered
      const timer = setTimeout(() => {
        const savedPosition = scrollPositions.get(key);
        // Only restore if we have a saved position, otherwise keep at 0
        if (savedPosition !== undefined && savedPosition > 0) {
          window.scrollTo(0, savedPosition);
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [key]);

  return null;
};

export default ScrollToTop;
