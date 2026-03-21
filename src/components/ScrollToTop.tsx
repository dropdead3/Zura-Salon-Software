import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Store scroll positions for dashboard routes
const scrollPositions = new Map<string, number>();

const ScrollToTop = () => {
  const { pathname } = useLocation();
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
    
    // Save the scroll position of the previous route before anything changes
    if (wasDashboard && prevPathname.current !== pathname) {
      scrollPositions.set(prevPathname.current, window.scrollY);
    }
    
    isNavigatingWithinDashboard.current = wasDashboard && isDashboard;
    
    if (wasDashboard && isDashboard) {
      // Navigating within dashboard - do nothing, let useEffect handle restoration
    } else {
      // Navigating to/from non-dashboard - scroll to top immediately
      window.scrollTo(0, 0);
    }
    
    prevPathname.current = pathname;
  }, [pathname]);

  // Use useEffect to restore scroll position after the DOM has been painted
  useEffect(() => {
    if (isNavigatingWithinDashboard.current) {
      // Small delay to ensure the new page content has rendered
      const timer = setTimeout(() => {
        const savedPosition = scrollPositions.get(pathname);
        // Only restore if we have a saved position, otherwise keep at 0
        if (savedPosition !== undefined && savedPosition > 0) {
          window.scrollTo(0, savedPosition);
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
