import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Wifi, WifiOff, Signal, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';

const features = [
  {
    icon: Signal,
    title: 'Cellular Failover',
    description: 'The S710 automatically switches from WiFi to cellular. No manual intervention. No downtime.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Store & Forward',
    description: 'If all connectivity is lost, payments are stored securely on the device and forwarded automatically when connection returns.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Check,
    title: 'Real-Time Visibility',
    description: 'Your dashboard shows exactly how many payments are queued, when they\'ll sync, and confirms when everything clears.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
];

export function NeverDownPayments() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const splitProgress = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);
  const greenOpacity = useTransform(splitProgress, [0, 1], [0, 1]);
  const greenX = useTransform(splitProgress, [0, 1], [40, 0]);
  const redDim = useTransform(splitProgress, [0.5, 1], [1, 0.35]);

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="font-display text-[11px] sm:text-xs text-[hsl(var(--mkt-dusky))] uppercase tracking-[0.15em] mb-4">
            Offline Protection
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            The WiFi went down. Your revenue didn't.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Every salon has lived this nightmare. A packed Saturday, the internet drops, and suddenly you can't take payments. With {PLATFORM_NAME} Pay and the S710, that scenario is over.
          </p>
        </div>

        {/* Animated split: WiFi Down → Payments Still Processing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch mb-16 min-h-[280px]">
          {/* Nightmare side */}
          <motion.div
            className="relative rounded-xl border border-red-500/[0.15] bg-red-500/[0.04] p-6 sm:p-8 overflow-hidden"
            style={{ opacity: redDim }}
          >
            <p className="font-display text-xs tracking-[0.15em] text-red-400 uppercase mb-5">
              Without {PLATFORM_NAME} Pay
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/[0.06]">
                <WifiOff className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="font-sans text-sm text-white/90">WiFi disconnected</p>
                  <p className="font-sans text-xs text-red-300/70">Card reader unable to process</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <span className="font-display text-2xl text-red-400">$0</span>
                <div>
                  <p className="font-sans text-xs text-slate-400">Revenue during outage</p>
                  <p className="font-sans text-[11px] text-red-300/60">Clients walking out, cash scramble</p>
                </div>
              </div>
              <p className="font-sans text-xs text-slate-500 text-center italic">
                "Sorry, our system is down right now..."
              </p>
            </div>
          </motion.div>

          {/* Protected side */}
          <motion.div
            className="relative rounded-xl border border-emerald-500/[0.15] bg-emerald-500/[0.04] p-6 sm:p-8 overflow-hidden"
            style={{ opacity: greenOpacity, x: greenX }}
          >
            <p className="font-display text-xs tracking-[0.15em] text-emerald-400 uppercase mb-5">
              With {PLATFORM_NAME} Pay + S710
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06]">
                <Signal className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-sans text-sm text-white/90">Cellular fallback active</p>
                  <p className="font-sans text-xs text-emerald-300/70">Payments processing via cellular</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <span className="font-display text-2xl text-emerald-400">100%</span>
                <div>
                  <p className="font-sans text-xs text-slate-400">Revenue captured</p>
                  <p className="font-sans text-[11px] text-emerald-300/60">Zero interruption to service</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-sans text-xs text-emerald-300">Every payment stored, forwarded, and confirmed.</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Three-column features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`rounded-xl border ${feature.border} ${feature.bg} p-6 transition-all hover:scale-[1.02]`}
            >
              <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="font-display text-sm tracking-wide uppercase mb-2">{feature.title}</h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Social proof + CTA */}
        <div className="text-center">
          <p className="font-display text-sm tracking-wide text-emerald-400 mb-6">
            Zero lost payments across all {PLATFORM_NAME} Pay locations.
          </p>
          <a
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-sans text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all"
          >
            See {PLATFORM_NAME} Pay in Action
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
