import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FooterCTA } from "./FooterCTA";
import { StickyFooterBar } from "./StickyFooterBar";
import { PageTransition } from "./PageTransition";
import { DesignOverridesApplier } from "@/components/home/DesignOverridesApplier";
import { PromotionalPopup } from "@/components/public/PromotionalPopup";
import type { PopupSurface } from "@/hooks/usePromotionalPopup";
import { useWebsiteColorTheme, WEBSITE_THEME_DEFAULT } from "@/hooks/useWebsiteColorTheme";

/**
 * Map the current public route to a promotional-popup surface key.
 * Operators target popups by logical surface (home / services / booking),
 * so the Layout must pass the actual page identity — not a hardcoded
 * 'all-public' that only matches when the operator opts site-wide.
 */
function resolvePopupSurface(pathname: string): PopupSurface {
  // Strip /org/:slug prefix so we can match against logical paths.
  const stripped = pathname.replace(/^\/org\/[^/]+/, "") || "/";
  if (stripped === "/" || stripped === "") return "home";
  if (stripped.startsWith("/booking")) return "booking";
  if (stripped.startsWith("/services")) return "services";
  // Anything else (about, contact, dynamic pages) only fires when the
  // operator chose 'all-public'. isPopupActive handles that match.
  return "all-public";
}

// CSS variable prefixes owned by Site Design overrides — must survive the
// per-mount theme wipe so live-preview + persisted overrides keep applying.
const DESIGN_OVERRIDE_VARS = new Set([
  '--primary',
  '--secondary',
  '--accent',
  '--background',
  '--font-display',
  '--font-sans',
  '--zura-density-scale',
  '--zura-button-radius',
  '--zura-hero-overlay',
  '--zura-section-tint',
]);

const DASHBOARD_THEME_CLASSES = [
  'theme-zura',
  'theme-cream-lux',
  'theme-bone', // legacy — strip if leftover from old persisted state
  'theme-rosewood',
  'theme-sage',
  'theme-jade',
  'theme-marine',
  'theme-cognac',
  'theme-noir',
  'theme-neon',
  'theme-matrix',
  'theme-peach',
  'theme-orchid',
  'theme-cream',
  'theme-rose',
  'theme-ocean',
  'theme-ember',
  'theme-prism',
];

function getIsEditorPreview() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('preview') === 'true';
}

function getIsViewMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mode') === 'view';
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isEditorPreview = getIsEditorPreview();
  const isViewMode = getIsViewMode();
  const location = useLocation();
  const popupSurface = resolvePopupSurface(location.pathname);
  const [footerHeight, setFooterHeight] = useState(0);
  const [showFooter, setShowFooter] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  // Operator-selected public-site color theme. Defaults to cream-lux to
  // preserve historical look until an operator explicitly picks otherwise.
  const { theme: websiteTheme } = useWebsiteColorTheme();
  const themeClass = `theme-${websiteTheme}`;

  // Immediately force light mode + the operator's chosen theme during render
  // (before useEffect) to prevent flash. We use the resolved theme from the
  // hook — on first paint this is the default, then re-renders pick up the
  // persisted setting once site_settings resolves.
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.remove(...DASHBOARD_THEME_CLASSES);
    root.classList.add(themeClass);
  }

  // Force light mode and reset any dashboard theme overrides for public website
  useEffect(() => {
    const root = document.documentElement;

    // Remove dark mode class
    root.classList.remove('dark');

    // Apply the operator's chosen public-site theme.
    root.classList.remove(...DASHBOARD_THEME_CLASSES);
    root.classList.add(themeClass);

    // Add editor-preview class for scrollbar hiding
    if (isEditorPreview) {
      root.classList.add('editor-preview');
    }

    // Clear any custom CSS variable overrides from dashboard theme
    const style = root.style;
    const propsToRemove: string[] = [];
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      // Only remove custom properties that could be from dashboard theme
      if (prop.startsWith('--') && !prop.includes('radix') && !DESIGN_OVERRIDE_VARS.has(prop)) {
        propsToRemove.push(prop);
      }
    }
    propsToRemove.forEach(prop => style.removeProperty(prop));

    return () => {
      if (isEditorPreview) {
        root.classList.remove('editor-preview');
      }
    };
  }, [isEditorPreview, themeClass]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      setShowFooter(scrollY + windowHeight > documentHeight - windowHeight * 2);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateFooterHeight = () => {
      if (footerRef.current) {
        setFooterHeight(footerRef.current.offsetHeight);
      }
    };

    const initialTimeout = setTimeout(updateFooterHeight, 100);
    
    const resizeObserver = new ResizeObserver(updateFooterHeight);
    if (footerRef.current) {
      resizeObserver.observe(footerRef.current);
    }

    window.addEventListener("resize", updateFooterHeight);
    document.fonts?.ready.then(updateFooterHeight);

    return () => {
      clearTimeout(initialTimeout);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFooterHeight);
    };
  }, []);

  // Editor iframe: simple linear layout — no parallax footer reveal.
  // Parallax creates gaps/dark edges inside the viewport bento box.
  if (isEditorPreview) {
    return (
      <div className={`min-h-screen flex flex-col relative ${themeClass} bg-background`} style={{ colorScheme: 'light' }}>
        <DesignOverridesApplier />
        <Header />
        <main className="flex-1 bg-background">
          {children}
        </main>
        <FooterCTA />
        <Footer />
        <PromotionalPopup surface={popupSurface} />
      </div>
    );
  }

  // Editor preview in view mode OR public site: full layout with footer reveal

  return (
    <div className={`min-h-screen flex flex-col relative ${themeClass} bg-secondary`} style={{ colorScheme: 'light' }}>
      <DesignOverridesApplier />
      {/* Fixed footer that reveals as content scrolls */}
      <div 
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-0 transition-opacity duration-300"
        style={{ opacity: showFooter ? 1 : 0, visibility: showFooter ? 'visible' : 'hidden' }}
      >
        <Footer />
      </div>

      {/* Main content that scrolls over the footer */}
      <div 
        className="relative z-10 flex flex-col min-h-screen bg-background rounded-b-[2rem] md:rounded-b-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)]"
        style={{ marginBottom: footerHeight }}
      >
        <Header />
        <main className="flex-1 bg-background">
          <PageTransition>{children}</PageTransition>
        </main>
        
        {/* CTA - part of scrolling content, NOT fixed footer */}
        <FooterCTA />
      </div>

      <StickyFooterBar />
      <PromotionalPopup surface={popupSurface} />
    </div>
  );
}
