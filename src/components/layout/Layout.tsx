import { ReactNode, useEffect, useState, useRef } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FooterCTA } from "./FooterCTA";
import { StickyFooterBar } from "./StickyFooterBar";
import { PageTransition } from "./PageTransition";

const isEditorPreview = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('preview');

// mode=view means "render exactly like public site" even inside editor iframe
const isViewMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('mode') === 'view';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [footerHeight, setFooterHeight] = useState(0);
  const [showFooter, setShowFooter] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  // Immediately force light mode during render (before useEffect) to prevent flash
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.remove('theme-rose', 'theme-sage', 'theme-ocean');
    root.classList.add('theme-cream');
  }

  // Force light mode and reset any dashboard theme overrides for public website
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove dark mode class
    root.classList.remove('dark');
    
    // Ensure cream theme is applied
    root.classList.remove('theme-rose', 'theme-sage', 'theme-ocean');
    root.classList.add('theme-cream');
    
    // Clear any custom CSS variable overrides from dashboard theme
    const style = root.style;
    const propsToRemove: string[] = [];
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      // Only remove custom properties that could be from dashboard theme
      if (prop.startsWith('--') && !prop.includes('radix')) {
        propsToRemove.push(prop);
      }
    }
    propsToRemove.forEach(prop => style.removeProperty(prop));
  }, []);

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

  // Editor preview in edit mode: simplified layout without fixed footer
  if (isEditorPreview && !isViewMode) {
    return (
      <div className="min-h-screen flex flex-col relative theme-cream" style={{ colorScheme: 'light' }}>
        <div className="relative z-10 flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-1 bg-background">
            {children}
          </main>
          <FooterCTA />
        </div>
      </div>
    );
  }

  // Editor preview in view mode OR public site: full layout with footer reveal

  return (
    <div className="min-h-screen flex flex-col relative theme-cream" style={{ colorScheme: 'light' }}>
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
        className="relative z-10 flex flex-col min-h-screen bg-background rounded-b-[2rem] md:rounded-b-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] overflow-hidden"
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
    </div>
  );
}
