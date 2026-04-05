import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Scissors, Users, Building2, Crown, BarChart3, CalendarCheck, UsersRound, Package, Link2 } from 'lucide-react';

/* ── Data ──────────────────────────────────────────────────────────────────── */

const personaItems = [
  { icon: Scissors, label: 'Independent Stylist', desc: 'Clarity from chair one.', href: '/solutions/independent' },
  { icon: Users, label: 'Salon Owner', desc: 'Confidence, not guesswork.', href: '/solutions/salon-owner' },
  { icon: Building2, label: 'Multi-Location Owner', desc: 'One standard everywhere.', href: '/solutions/multi-location' },
  { icon: Crown, label: 'Enterprise Leader', desc: 'Portfolio-level visibility.', href: '/solutions/enterprise' },
];

const solutionItems = [
  { icon: BarChart3, label: 'Business Visibility', desc: 'See what matters, act on what counts.', href: '/product' },
  { icon: CalendarCheck, label: 'Smart Scheduling', desc: 'Fill chairs with purpose.', href: '/solutions/scheduling' },
  { icon: UsersRound, label: 'Team Performance', desc: 'Grow the people who grow you.', href: '/solutions/team' },
  { icon: Package, label: 'Inventory Control', desc: 'Know what you have. Use what you need.', href: '/solutions/inventory' },
  { icon: Link2, label: 'Connected Platform', desc: 'Everything works together.', href: '/ecosystem' },
];

/* ── Desktop Dropdown ─────────────────────────────────────────────────────── */

interface DesktopDropdownProps {
  open: boolean;
  onClose: () => void;
}

function DesktopDropdown({ open, onClose }: DesktopDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);

  useEffect(() => {
    if (!open) {
      setOffsetX(0);
      return;
    }

    const reposition = () => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 16;
      let shift = 0;

      if (rect.right > vw - margin) {
        shift = vw - margin - rect.right;
      } else if (rect.left < margin) {
        shift = margin - rect.left;
      }
      setOffsetX(shift);
    };

    requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ left: `calc(50% + ${offsetX}px)`, transform: 'translateX(-50%)' }}
            className="absolute top-full mt-2 w-[680px] z-50 bg-slate-950/95 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
              {/* Left: Personas */}
              <div className="p-5">
                <p className="font-sans text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">
                  Who are you?
                </p>
                <div className="space-y-0.5">
                  {personaItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-white group-hover:text-violet-200 transition-colors">{item.label}</p>
                        <p className="font-sans text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right: Solutions */}
              <div className="p-5">
                <p className="font-sans text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">
                  Solutions
                </p>
                <div className="space-y-0.5">
                  {solutionItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-white group-hover:text-violet-200 transition-colors">{item.label}</p>
                        <p className="font-sans text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between bg-white/[0.02]">
              <p className="font-sans text-xs text-slate-500">Not sure where to start?</p>
              <Link
                to="/demo"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 font-sans text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Get a Demo
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Mobile Accordion ─────────────────────────────────────────────────────── */

interface MobileAccordionProps {
  onNavigate: () => void;
}

function MobileAccordion({ onNavigate }: MobileAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full font-sans text-base text-slate-300 hover:text-white transition-colors py-2"
      >
        Solutions
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-3 pl-3 space-y-4">
              <div>
                <p className="font-sans text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-2">Who are you?</p>
                <div className="space-y-1">
                  {personaItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 py-1.5 font-sans text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-violet-400" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-sans text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-2">Solutions</p>
                <div className="space-y-1">
                  {solutionItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 py-1.5 font-sans text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-violet-400" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Exports ──────────────────────────────────────────────────────────────── */

export function SolutionsDesktopTrigger() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 150);
  }, []);

  const handleLeave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-sans text-sm text-slate-400 hover:text-white transition-colors tracking-wide"
      >
        Solutions
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <DesktopDropdown open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export { MobileAccordion as SolutionsMobileAccordion };
