import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPrimaryOrgSlug } from '@/hooks/useUserPrimaryOrgSlug';
import { PlatformLogo } from '@/components/brand/PlatformLogo';
import { cn } from '@/lib/utils';
import { SolutionsDesktopTrigger, SolutionsMobileAccordion } from './SolutionsMegaMenu';

export function MarketingNav() {
  const { user } = useAuth();
  // Provider-free org resolver — MarketingNav lives outside OrganizationProvider
  // per the Public vs Private Route Isolation canon.
  const { slug, name } = useUserPrimaryOrgSlug();
  const dashboardHref = slug ? `/org/${slug}/dashboard/` : '/dashboard';
  const ctaLabel = name ? `Open ${name}` : 'Go to Dashboard';
  const ctaAria = name ? `Open ${name} dashboard` : 'Go to dashboard';
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const cumulativeDelta = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const THRESHOLD = 15;

    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const currentY = window.scrollY;
        setScrolled(currentY > 80);

        if (currentY < 100) {
          setNavVisible(true);
          cumulativeDelta.current = 0;
        } else {
          cumulativeDelta.current += currentY - lastScrollY.current;

          if (cumulativeDelta.current > THRESHOLD) {
            setNavVisible(false);
            cumulativeDelta.current = 0;
          } else if (cumulativeDelta.current < -THRESHOLD) {
            setNavVisible(true);
            cumulativeDelta.current = 0;
          }
        }

        lastScrollY.current = currentY;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const navLinks = [
    { label: 'Ecosystem', href: '/ecosystem' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Try Demo', href: '/explore' },
    { label: 'About', href: '/about' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
    <header
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl transition-all duration-300',
        navVisible ? 'translate-y-0 opacity-100' : '-translate-y-[calc(100%+2rem)] opacity-0'
      )}
    >
      <nav
        className={cn(
          'flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 border shadow-lg shadow-black/20',
          scrolled
            ? 'bg-white/[0.08] backdrop-blur-xl border-white/[0.1]'
            : 'bg-white/[0.05] backdrop-blur-xl border-white/[0.08]'
        )}
      >
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
              to={dashboardHref}
              aria-label={ctaAria}
              className="inline-flex items-center gap-2 h-10 pl-6 pr-5 bg-white text-slate-950 hover:bg-slate-100 rounded-full font-sans text-sm font-medium transition-colors max-w-[260px]"
            >
              <span className="truncate max-w-[180px]">{ctaLabel}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
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
            className="md:hidden fixed inset-0 top-[72px] bg-slate-950/95 backdrop-blur-xl z-50 px-6 pb-6 pt-4 overflow-y-auto"
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
                  to={dashboardHref}
                  aria-label={ctaAria}
                  className="inline-flex items-center justify-center gap-2 h-12 w-full bg-white text-slate-950 rounded-full font-sans text-sm font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="truncate max-w-[220px]">{ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
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

      <AnimatePresence>
        {!navVisible && (
          <motion.div
            initial={{ y: 100, x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: 100, x: '-50%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-4 left-1/2 z-50 w-auto max-w-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-full py-3 px-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-6">
              <span className="font-sans text-sm text-slate-300 whitespace-nowrap">
                Ready for a better salon software?
              </span>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 h-9 px-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-sm font-medium transition-all shadow-lg shadow-violet-500/25 whitespace-nowrap"
              >
                Book A Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
