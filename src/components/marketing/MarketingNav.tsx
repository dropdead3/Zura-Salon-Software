import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformLogo } from '@/components/brand/PlatformLogo';
import { cn } from '@/lib/utils';
import { SolutionsDesktopTrigger, SolutionsMobileAccordion } from './SolutionsMegaMenu';

export function MarketingNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Ecosystem', href: '/ecosystem' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-transparent'
      )}
    >
      <nav className="flex items-center justify-between px-6 sm:px-8 py-4 max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <PlatformLogo variant="landing" className="h-5 sm:h-6" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <SolutionsDesktopTrigger />
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="font-sans text-sm text-slate-400 hover:text-white transition-colors tracking-wide"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-sm font-medium text-white transition-all shadow-lg shadow-violet-500/20 mkt-cta-shimmer"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="font-sans text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 h-10 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-sm font-medium text-white transition-all shadow-lg shadow-violet-500/20 mkt-cta-shimmer"
              >
                Get a Demo
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-slate-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/[0.06] px-6 pb-6 pt-4">
          <div className="flex flex-col gap-4">
            <SolutionsMobileAccordion onNavigate={() => setMobileOpen(false)} />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-sans text-base text-slate-300 hover:text-white transition-colors py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/[0.06]" />
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 h-12 w-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full font-sans text-sm font-medium text-white"
                onClick={() => setMobileOpen(false)}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-sans text-base text-slate-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center justify-center gap-2 h-12 w-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full font-sans text-sm font-medium text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Get a Demo
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
