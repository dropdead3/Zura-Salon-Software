import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileSpreadsheet, MessageSquare, Calendar, AlertTriangle, TrendingUp, Zap, Check, Clock, DollarSign, Users, ShoppingBag, Phone } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';

const chaosCards = [
  { icon: FileSpreadsheet, label: 'Revenue_Report_v3_FINAL.xlsx', color: 'text-slate-300', rotate: -4, x: '3%', y: '8%' },
  { icon: MessageSquare, label: '"Can someone cover Tuesday?"', color: 'text-amber-400', rotate: 3, x: '38%', y: '3%' },
  { icon: Calendar, label: '3 gaps on Thursday', color: 'text-slate-300', rotate: -2, x: '8%', y: '50%' },
  { icon: AlertTriangle, label: 'Low stock: Olaplex No.3', color: 'text-amber-500', rotate: 5, x: '55%', y: '42%' },
  { icon: FileSpreadsheet, label: 'Payroll_March_REVISED.csv', color: 'text-slate-300', rotate: -6, x: '58%', y: '12%' },
  { icon: MessageSquare, label: '"Is Sarah rebooking?"', color: 'text-slate-300', rotate: 2, x: '22%', y: '30%' },
  { icon: Clock, label: '"Where did my 2pm cancel go?"', color: 'text-slate-300', rotate: -3, x: '5%', y: '75%' },
  { icon: DollarSign, label: 'Commission math doesn\'t add up', color: 'text-red-400', rotate: 4, x: '42%', y: '68%' },
  { icon: Users, label: '3rd no-call no-show this month', color: 'text-amber-400', rotate: -5, x: '55%', y: '78%' },
  { icon: ShoppingBag, label: '"Who ordered more Redken?"', color: 'text-slate-300', rotate: 1, x: '30%', y: '58%' },
  { icon: Phone, label: 'Missed 4 calls while cutting', color: 'text-amber-500', rotate: -1, x: '65%', y: '28%' },
];

export function ChaosToClarity() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const clarityOpacity = useTransform(scrollYProgress, [0.4, 0.58], [0, 1]);
  const clarityX = useTransform(scrollYProgress, [0.4, 0.58], [60, 0]);
  const chaosDim = useTransform(scrollYProgress, [0.45, 0.6], [1, 0.4]);
  const dividerX = useTransform(scrollYProgress, [0.4, 0.58], ['100%', '0%']);

  return (
    <section id="chaos-to-clarity" ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="font-display text-[11px] sm:text-xs text-[hsl(var(--mkt-dusky))] uppercase tracking-[0.15em] mb-4">
            Sound familiar?
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            This is what running a salon feels like.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Spreadsheets. Group texts. Half-answers. You're working harder than you should to figure out what's actually going on.
          </p>
        </div>

        {/* Split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch min-h-[380px]">
          {/* Chaos side */}
          <motion.div
            className="relative rounded-xl border border-white/[0.12] bg-white/[0.04] p-6 sm:p-8 overflow-hidden min-h-[380px]"
            style={{ opacity: chaosDim }}
          >
            <p className="font-display text-[10px] tracking-[0.15em] text-slate-400 uppercase mb-6">
              Your Monday morning
            </p>

            {/* Scattered chaos cards */}
            {chaosCards.map((card, i) => (
              <div
                key={i}
                className="absolute flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.12] bg-slate-800/70 backdrop-blur-sm shadow-lg max-w-[220px]"
                style={{
                  left: card.x,
                  top: card.y,
                  transform: `rotate(${card.rotate}deg)`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <card.icon className={`w-3.5 h-3.5 shrink-0 ${card.color}`} />
                <span className="font-sans text-[11px] text-slate-300 truncate">{card.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Clarity side */}
          <motion.div
            className="relative rounded-xl border border-violet-500/[0.15] bg-violet-500/[0.04] p-6 sm:p-8 overflow-hidden"
            style={{ opacity: clarityOpacity, x: clarityX }}
          >
            <p className="font-display text-[10px] tracking-[0.15em] text-violet-400 uppercase mb-6">
              Your Monday with {PLATFORM_NAME}
            </p>

            {/* Clean KPI card */}
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <span className="font-sans text-xs text-slate-400">Weekly Utilization</span>
                </div>
                <div className="font-display text-2xl tracking-tight text-white">87%</div>
                <div className="font-sans text-[11px] text-emerald-400 mt-1">+12% from last week</div>
              </div>

              {/* Lever card */}
              <div className="p-4 rounded-xl border border-violet-500/[0.12] bg-violet-500/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span className="font-display text-[10px] tracking-[0.12em] text-violet-400">PRIMARY LEVER</span>
                </div>
                <p className="font-sans text-sm text-white/90 leading-snug">
                  Redistribute Tuesday capacity — projected $4,200/mo uplift
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                  </div>
                  <span className="font-sans text-[10px] text-slate-500">High confidence</span>
                </div>
              </div>

              {/* Action confirmation */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-sans text-xs text-emerald-300">One decision. The rest runs itself.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
