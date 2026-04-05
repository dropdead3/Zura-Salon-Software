import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformLogo } from '@/components/brand/PlatformLogo';
import { cn } from '@/lib/utils';
import { SolutionsDesktopTrigger, SolutionsMobileAccordion } from './SolutionsMegaMenu';

export function MarketingNav() {
  const { user } = useAuth();
  const location = useLocation();
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
    { label: 'Try Demo', href: '/explore' },
    { label: 'About', href: '/about' },
  ];

  const isActive = (href: string) => location.pathname === href;

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
              className={cn(
                'font-sans text-sm transition-colors tracking-wide',
                isActive(link.href)
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-6 bg-white text-slate-950 hover:bg-slate-100 rounded-full font-sans text-sm font-medium transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="font-sans text-sm text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 h-10 px-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 rounded-full font-sans text-sm font-medium transition-all"
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 top-[64px] bg-slate-950 z-50 px-6 pb-6 pt-4 overflow-y-auto"
          >
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
                  className="inline-flex items-center justify-center gap-2 h-12 w-full bg-white text-slate-950 rounded-full font-sans text-sm font-medium"
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
                    className="inline-flex items-center justify-center gap-2 h-12 w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 rounded-full font-sans text-sm font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get a Demo
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
