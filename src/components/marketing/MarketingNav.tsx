import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PLATFORM_NAME } from '@/lib/brand';
import { PlatformLogo } from '@/components/brand/PlatformLogo';
import { cn } from '@/lib/utils';

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
    { label: 'Product', href: '/product' },
    { label: 'Ecosystem', href: '/ecosystem' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      )}
    >
      <nav className="flex items-center justify-between px-6 sm:px-8 py-4 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <PlatformLogo variant="landing" className="h-5 sm:h-6" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
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

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-6 bg-violet-600 hover:bg-violet-500 rounded-lg font-sans text-sm font-medium text-white transition-colors"
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
                className="inline-flex items-center gap-2 h-10 px-6 bg-violet-600 hover:bg-violet-500 rounded-lg font-sans text-sm font-medium text-white transition-colors"
              >
                Request Demo
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-slate-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/[0.06] px-6 pb-6 pt-4">
          <div className="flex flex-col gap-4">
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
                className="inline-flex items-center justify-center gap-2 h-12 w-full bg-violet-600 hover:bg-violet-500 rounded-xl font-sans text-sm font-medium text-white transition-colors"
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
                  className="inline-flex items-center justify-center gap-2 h-12 w-full bg-violet-600 hover:bg-violet-500 rounded-xl font-sans text-sm font-medium text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Request Demo
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
