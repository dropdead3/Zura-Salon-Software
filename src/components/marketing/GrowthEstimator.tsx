import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, BarChart3, Zap, ChevronDown, ArrowRight, Shield } from 'lucide-react';
import { useScrollReveal } from '@/components/marketing/useScrollReveal';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';

type ServiceFocus = 'extensions' | 'color' | 'blonding' | 'mixed';

const SERVICE_OPTIONS: { value: ServiceFocus; label: string }[] = [
  { value: 'extensions', label: 'Extensions' },
  { value: 'color', label: 'Color' },
  { value: 'blonding', label: 'Blonding' },
  { value: 'mixed', label: 'Mixed' },
];

const SERVICE_RANGES: Record<ServiceFocus, [number, number]> = {
  extensions: [0.18, 0.28],
  color: [0.12, 0.22],
  blonding: [0.15, 0.25],
  mixed: [0.14, 0.24],
};

function calcOpportunity(revenue: number, stylists: number, service: ServiceFocus, utilization: number) {
  const [lo, hi] = SERVICE_RANGES[service];
  const stylistFactor = Math.min(stylists / 6, 1);
  const baseRate = lo + (hi - lo) * (0.5 + stylistFactor * 0.3);

  const capacityMultiplier = 1 + (1 - utilization / 100) * 0.4;
  const scaleMultiplier = Math.max(0.5, 1 - (revenue / 500000) * 0.3);

  let total = revenue * baseRate * capacityMultiplier * scaleMultiplier;
  total = Math.min(total, revenue * 0.35);
  total = Math.max(total, 0);

  const demand = total * 0.4;
  const conversion = total * 0.35;
  const capacity = total * 0.25;
  const expansion = total * 0.4;

  return { total: Math.round(total), demand: Math.round(demand), conversion: Math.round(conversion), capacity: Math.round(capacity), expansion: Math.round(expansion) };
}

function formatDollar(n: number) {
  return n.toLocaleString('en-US');
}

export function GrowthEstimator() {
  const sectionRef = useScrollReveal();
  const isMobile = useIsMobile();

  const [revenue, setRevenue] = useState(25000);
  const [revenueInput, setRevenueInput] = useState('25,000');
  const [stylists, setStylistsRaw] = useState(4);
  const [stylistsInput, setStylistsInput] = useState('4');
  const [service, setService] = useState<ServiceFocus>('mixed');
  const [utilization, setUtilization] = useState(65);
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  const result = useMemo(() => calcOpportunity(revenue, stylists, service, utilization), [revenue, stylists, service, utilization]);

  const handleRevenueChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10) || 0;
    setRevenue(num);
    setRevenueInput(num > 0 ? num.toLocaleString('en-US') : '');
  };

  const handleStylistsChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10) || 0;
    setStylistsRaw(Math.min(num, 200));
    setStylistsInput(cleaned);
  };

  const breakdownItems = [
    { icon: TrendingUp, label: 'Demand Generation', sub: 'SEO & visibility', value: result.demand, pct: result.total > 0 ? 40 : 0 },
    { icon: Users, label: 'Conversion Improvements', sub: 'Rebooking & reviews', value: result.conversion, pct: result.total > 0 ? 35 : 0 },
    { icon: Zap, label: 'Capacity Optimization', sub: 'Booking efficiency', value: result.capacity, pct: result.total > 0 ? 25 : 0 },
  ];

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-white font-sans text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 transition-colors';
  const labelClass = 'block text-slate-400 font-sans text-sm mb-2';

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Subtle bg glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-violet-600/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 mkt-reveal">
          <p className="font-display text-xs tracking-[0.2em] text-violet-400/70 mb-4">
            GROWTH ESTIMATOR
          </p>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight text-white mb-4">
            See Your Growth Potential
          </h2>
          <p className="font-sans text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Estimate how much opportunity may exist in your business based on common optimization scenarios.
          </p>
        </div>

        {/* Two-column layout */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-8' : 'grid-cols-2 gap-12'} items-start mkt-reveal`}>
          {/* LEFT — Inputs */}
          <motion.div
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 md:p-8 backdrop-blur-sm"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-display text-sm tracking-[0.12em] text-slate-300 mb-6">YOUR BUSINESS</h3>

            <div className="space-y-5">
              {/* Monthly Revenue */}
              <div>
                <label className={labelClass}>Monthly Revenue</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-sans text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={revenueInput}
                    onChange={(e) => handleRevenueChange(e.target.value)}
                    placeholder="25,000"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>

              {/* Number of Stylists */}
              <div>
                <label className={labelClass}>Number of Stylists</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={stylistsInput}
                  onChange={(e) => handleStylistsChange(e.target.value)}
                  placeholder="4"
                  className={inputClass}
                />
              </div>

              {/* Service Focus */}
              <div>
                <label className={labelClass}>Primary Service Focus</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value as ServiceFocus)}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  {SERVICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Utilization Slider */}
              <div>
                <label className={labelClass}>
                  Booking Utilization
                  <span className="ml-2 text-violet-400 font-display text-xs tracking-wider">{utilization}%</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={utilization}
                  onChange={(e) => setUtilization(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-violet-500/30 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                />
                <div className="flex justify-between text-[11px] text-slate-600 font-sans mt-1">
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Output */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {/* Primary output */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 md:p-8 backdrop-blur-sm text-center">
              <p className="font-sans text-sm text-slate-400 mb-2">Estimated Monthly Growth Opportunity</p>
              <p className="font-display text-4xl md:text-5xl tracking-tight bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                +$<AnimatedNumber value={result.total} duration={800} />
              </p>
            </div>

            {/* Breakdown cards */}
            <div className="space-y-3">
              <p className="font-sans text-xs text-slate-500 tracking-wide">WHERE THIS OPPORTUNITY MAY COME FROM</p>
              {breakdownItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 flex items-center gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm text-white">{item.label}</p>
                    <p className="font-sans text-xs text-slate-500">{item.sub}</p>
                  </div>
                  <p className="font-display text-sm text-violet-300 tracking-wide shrink-0">
                    +$<AnimatedNumber value={item.value} duration={600} />
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Secondary — expansion */}
            <AnimatePresence>
              {result.total > 3000 && (
                <motion.div
                  className="rounded-lg border border-violet-500/10 bg-violet-500/[0.04] p-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <p className="font-sans text-sm text-slate-400">
                    With expansion and funding, this opportunity could increase further
                  </p>
                  <p className="font-display text-lg text-violet-300 tracking-wide mt-1">
                    +$<AnimatedNumber value={result.expansion} duration={800} />
                    <span className="text-xs text-slate-500 font-sans ml-2">additional potential</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Disclaimer */}
            <div className="space-y-2">
              <p className="font-sans text-xs text-slate-500 leading-relaxed">
                This estimate is based on modeled scenarios using your inputs and common optimization patterns. Actual results will vary based on execution, market conditions, and individual business factors.
              </p>
              <Collapsible open={disclosureOpen} onOpenChange={setDisclosureOpen}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors font-sans cursor-pointer">
                  How this is calculated
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${disclosureOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="font-sans text-xs text-slate-600 mt-2 leading-relaxed">
                    This estimate considers common growth levers such as improved demand generation, better booking conversion, and increased operational efficiency. It is not a guarantee of results. Projections are modeled with diminishing returns at higher revenue levels and capped to remain conservative.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </motion.div>
        </div>

        {/* CTA Block */}
        <div className="text-center mt-16 mkt-reveal">
          <p className="font-display text-xl md:text-2xl text-white mb-6 tracking-tight">
            Ready to grow without guessing?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-sans text-sm text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30"
            >
              Get My Growth Plan
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-sans text-sm text-slate-300 border border-white/[0.1] hover:bg-white/[0.05] transition-all duration-300"
            >
              See How Zura Works
            </Link>
          </div>

          {/* Conversion bridge */}
          <div className="flex items-center justify-center gap-2 mt-10">
            <Shield className="w-4 h-4 text-slate-600" />
            <p className="font-sans text-sm text-slate-500">
              When the opportunity is large enough, Zura helps you act on it — including access to funding when appropriate.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
