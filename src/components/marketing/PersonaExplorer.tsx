import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors, Users, Building2, Crown,
  DollarSign, CalendarCheck, Heart, BarChart3,
  Wallet, UserPlus, GraduationCap, Eye,
  Coffee, Megaphone, GitCompare, TrendingUp,
  Shield, ClipboardList, Brain, Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';
import { Button } from '@/components/ui/button';

/* ── Persona definitions ──────────────────────────────────────────────────── */
type PersonaKey = 'independent' | 'salon-owner' | 'multi-location' | 'enterprise';

interface Persona {
  key: PersonaKey;
  icon: typeof Scissors;
  label: string;
  tagline: string;
}

const personas: Persona[] = [
  { key: 'independent', icon: Scissors, label: 'Independent Stylist', tagline: 'Building your own brand behind the chair.' },
  { key: 'salon-owner', icon: Users, label: 'Salon Owner', tagline: 'Managing a team. Wearing every hat.' },
  { key: 'multi-location', icon: Building2, label: 'Multi-Location Owner', tagline: 'Growing fast. Keeping it together.' },
  { key: 'enterprise', icon: Crown, label: 'Enterprise Leader', tagline: 'Running a brand. Thinking in margins.' },
];

/* ── Problem definitions ──────────────────────────────────────────────────── */
interface Problem {
  id: string;
  label: string;
  personas: PersonaKey[];
}

const problems: Problem[] = [
  { id: 'pricing', label: "I don't know if I'm pricing right", personas: ['independent', 'salon-owner'] },
  { id: 'bookings', label: 'My calendar has too many gaps', personas: ['independent', 'salon-owner'] },
  { id: 'retention', label: "Clients leave and I don't know why", personas: ['independent', 'salon-owner'] },
  { id: 'income', label: "I can't see where my money goes", personas: ['independent'] },
  { id: 'marketing', label: 'Marketing feels like guessing', personas: ['independent', 'salon-owner'] },
  { id: 'team-pay', label: 'Commission and pay are a mess', personas: ['salon-owner', 'multi-location'] },
  { id: 'hiring', label: 'Hiring and keeping great people is hard', personas: ['salon-owner', 'multi-location'] },
  { id: 'training', label: 'My team has no growth path', personas: ['salon-owner'] },
  { id: 'profit', label: "I don't know my real profit per service", personas: ['salon-owner', 'multi-location'] },
  { id: 'stepping-away', label: "I can't step away without things falling apart", personas: ['salon-owner'] },
  { id: 'consistency', label: 'Every location runs differently', personas: ['multi-location', 'enterprise'] },
  { id: 'benchmarking', label: "I can't compare locations fairly", personas: ['multi-location', 'enterprise'] },
  { id: 'manager-tools', label: 'My managers need better tools', personas: ['multi-location'] },
  { id: 'scaling', label: "I'm growing but my systems aren't", personas: ['multi-location'] },
  { id: 'onboarding', label: 'Onboarding new locations takes too long', personas: ['multi-location', 'enterprise'] },
  { id: 'cross-market', label: 'I need data across all my markets', personas: ['enterprise'] },
  { id: 'executive-reporting', label: "My reporting doesn't match my decisions", personas: ['enterprise'] },
  { id: 'standards', label: 'Standards slip without me knowing', personas: ['enterprise'] },
  { id: 'forecasting', label: 'I need to forecast with confidence', personas: ['enterprise'] },
];

/* ── Solution definitions ─────────────────────────────────────────────────── */
interface Solution {
  problemId: string;
  icon: typeof DollarSign;
  headline: string;
  description: string;
  stat: string;
}

const solutions: Solution[] = [
  { problemId: 'pricing', icon: DollarSign, headline: 'Know your real numbers', description: 'See exactly how much you make per service after product cost, time, and commission. Adjust pricing with confidence — not guesswork.', stat: 'Owners raise margins 12–18% in the first quarter' },
  { problemId: 'bookings', icon: CalendarCheck, headline: 'Fill your calendar with purpose', description: 'Spot booking gaps before they happen. Smart recommendations help you rebook clients and fill open slots without discounting.', stat: 'Reduce calendar gaps by up to 30%' },
  { problemId: 'retention', icon: Heart, headline: "See who's slipping away", description: "Track which clients haven't rebooked and why. Get alerts before they leave — so you can reach out while it still matters.", stat: 'Retain 15% more clients year over year' },
  { problemId: 'income', icon: Wallet, headline: 'Track every dollar clearly', description: 'One view of your income, expenses, and take-home pay. No more guessing what you actually made this month.', stat: 'Save 5+ hours/month on bookkeeping' },
  { problemId: 'marketing', icon: Megaphone, headline: 'Market with data, not hope', description: 'Know which promotions actually bring clients back and which waste money. Spend on what works — automatically.', stat: 'Cut wasted ad spend by up to 40%' },
  { problemId: 'team-pay', icon: DollarSign, headline: 'Commission done right', description: 'Set up transparent commission tiers your team can see. Automate calculations so payroll day is simple and dispute-free.', stat: 'Eliminate 90% of pay disputes' },
  { problemId: 'hiring', icon: UserPlus, headline: 'Attract and keep your best people', description: 'Build a culture where top talent stays. Performance tracking and career paths give your team real reasons to grow with you.', stat: 'Reduce turnover by up to 25%' },
  { problemId: 'training', icon: GraduationCap, headline: 'Give your team a growth path', description: 'Build transparent performance tiers and career levels. Your team sees exactly what it takes to earn more — and stays motivated.', stat: 'Teams with clear paths retain 2x longer' },
  { problemId: 'profit', icon: BarChart3, headline: 'See profit by service', description: 'Know which services make you money and which cost you. Adjust your menu with real data instead of gut feeling.', stat: 'Identify hidden losses within your first week' },
  { problemId: 'stepping-away', icon: Coffee, headline: 'Step away without worry', description: 'Automated alerts, structured workflows, and performance visibility mean your salon runs on systems — not just you.', stat: 'Owners save 8+ hours/week' },
  { problemId: 'consistency', icon: GitCompare, headline: 'Set standards once. Enforce everywhere.', description: 'Define how every location should operate. Benchmark performance across locations and catch drift before it costs you.', stat: 'Reduce cross-location variance by 35%' },
  { problemId: 'benchmarking', icon: TrendingUp, headline: 'Compare locations fairly', description: 'See side-by-side performance across every metric that matters. Identify your best location and replicate what works.', stat: 'Top-performing locations lift others by 20%' },
  { problemId: 'manager-tools', icon: ClipboardList, headline: 'Empower your managers', description: 'Give location managers daily performance clarity and intervention tools. They act faster because they see what matters.', stat: 'Managers resolve issues 3x faster' },
  { problemId: 'scaling', icon: Target, headline: 'Scale without breaking', description: 'Your systems should grow with you. Structured workflows, automated onboarding, and performance tracking scale from 2 to 20 locations.', stat: 'Open new locations 40% faster' },
  { problemId: 'onboarding', icon: UserPlus, headline: 'Onboard locations in days, not months', description: 'Standardized setup flows, pre-built templates, and automated configuration get new locations running on your standards from day one.', stat: 'Cut onboarding time by 60%' },
  { problemId: 'cross-market', icon: Eye, headline: 'One view across every market', description: 'Unified dashboards that roll up data across regions and brands. Make portfolio-level decisions with portfolio-level visibility.', stat: 'Executive decisions backed by real-time data' },
  { problemId: 'executive-reporting', icon: Brain, headline: 'Reports that match how you think', description: 'Weekly intelligence briefs ranked by impact — not raw data dumps. See exactly which lever to pull next across your entire brand.', stat: 'Replace 6+ spreadsheets with one brief' },
  { problemId: 'standards', icon: Shield, headline: 'Catch drift before it costs you', description: 'Automated monitoring flags when any location deviates from your standards. You intervene early — not after damage is done.', stat: 'Detect deviations within 48 hours' },
  { problemId: 'forecasting', icon: TrendingUp, headline: 'Forecast with confidence', description: 'Model scenarios before committing capital. See how pricing changes, new hires, or expansions affect your bottom line.', stat: 'Forecasts within 5% accuracy' },
];

/* ── Max problems selectable ──────────────────────────────────────────────── */
const MAX_PROBLEMS = 3;

/* ── Component ────────────────────────────────────────────────────────────── */
export function PersonaExplorer() {
  const sectionRef = useScrollReveal();
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey | null>(null);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);

  const filteredProblems = problems.filter(
    (p) => selectedPersona && p.personas.includes(selectedPersona)
  );

  const filteredSolutions = solutions.filter((s) =>
    selectedProblems.includes(s.problemId)
  );

  const handlePersonaSelect = useCallback((key: PersonaKey) => {
    setSelectedPersona(key);
    setSelectedProblems([]);
  }, []);

  const toggleProblem = useCallback((id: string) => {
    setSelectedProblems((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PROBLEMS) return prev;
      return [...prev, id];
    });
  }, []);

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center mb-12 sm:mb-16 mkt-reveal">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            Find Your Solution
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Tell us who you are. We'll show you what changes.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Select your role and the problems that matter most — and see exactly how {PLATFORM_NAME} solves them.
          </p>
        </div>

        {/* ── Step 1: Persona cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mkt-reveal" style={{ transitionDelay: '0.1s' }}>
          {personas.map((persona) => {
            const isSelected = selectedPersona === persona.key;
            return (
              <button
                key={persona.key}
                type="button"
                onClick={() => handlePersonaSelect(persona.key)}
                className={`
                  text-left p-6 rounded-2xl mkt-glass cursor-pointer transition-all duration-300
                  ${isSelected
                    ? 'border-violet-500/50 shadow-[0_0_30px_-5px_hsl(263_70%_55%/0.25)]'
                    : 'border-transparent hover:border-white/10'
                  }
                `}
                style={{ borderWidth: '1px', borderStyle: 'solid' }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${isSelected ? 'bg-violet-500/20' : 'bg-violet-500/10'}`}>
                  <persona.icon className={`w-6 h-6 transition-colors duration-300 ${isSelected ? 'text-violet-300' : 'text-violet-400'}`} />
                </div>
                <h3 className="font-display text-xs tracking-[0.12em] mb-1">
                  {persona.label}
                </h3>
                <p className="font-serif text-sm text-violet-300 italic">
                  {persona.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Step 2: Problem chips ───────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedPersona && (
            <motion.div
              key={selectedPersona}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10"
            >
              <p className="font-sans text-sm text-slate-400 text-center mb-5">
                What keeps you up at night? <span className="text-slate-500">(Pick up to {MAX_PROBLEMS})</span>
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {filteredProblems.map((problem) => {
                  const isSelected = selectedProblems.includes(problem.id);
                  const isDisabled = !isSelected && selectedProblems.length >= MAX_PROBLEMS;
                  return (
                    <button
                      key={problem.id}
                      type="button"
                      onClick={() => toggleProblem(problem.id)}
                      disabled={isDisabled}
                      className={`
                        font-sans text-sm px-4 py-2 rounded-full border transition-all duration-200
                        ${isSelected
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                        }
                        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {problem.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 3: Solution cards ──────────────────────────────────── */}
        <AnimatePresence>
          {filteredSolutions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-12"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSolutions.map((solution, i) => (
                  <motion.div
                    key={solution.problemId}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="p-6 rounded-2xl mkt-glass"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                      <solution.icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <h3 className="font-display text-xs tracking-[0.12em] mb-2">
                      {solution.headline}
                    </h3>
                    <p className="font-sans text-sm text-slate-400 leading-relaxed mb-4">
                      {solution.description}
                    </p>
                    <p className="font-sans text-xs text-violet-400/80 italic">
                      {solution.stat}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* ── CTA ───────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center mt-10"
              >
                <Button asChild variant="default" size="lg">
                  <Link to="/demo">
                    See how {PLATFORM_NAME} works for you
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
