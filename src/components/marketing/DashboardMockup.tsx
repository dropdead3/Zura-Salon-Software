import { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, Zap, BarChart3, Users, Check, MousePointer2 } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';

type Phase = 'observe' | 'detect' | 'act' | 'pause';

const PHASE_DURATIONS: Record<Phase, number> = {
  observe: 3000,
  detect: 3000,
  act: 3000,
  pause: 2000,
};

interface KpiDef {
  label: string;
  icon: typeof TrendingUp;
  before: number;
  after: number;
  prefix: string;
  suffix: string;
  decimals: number;
  changeLabel: string;
  isTarget?: boolean; // highlighted in detect phase
}

const kpis: KpiDef[] = [
  { label: 'Revenue', icon: TrendingUp, before: 248, after: 284, prefix: '$', suffix: 'K', decimals: 0, changeLabel: '+$36K' },
  { label: 'Utilization', icon: BarChart3, before: 75, after: 87, prefix: '', suffix: '%', decimals: 0, changeLabel: '+12%', isTarget: true },
  { label: 'Active Clients', icon: Users, before: 2847, after: 2847, prefix: '', suffix: '', decimals: 0, changeLabel: '' },
  { label: 'Margin', icon: Zap, before: 31.1, after: 34.2, prefix: '', suffix: '%', decimals: 1, changeLabel: '+3.1%' },
];

// SVG chart paths
const CHART_BEFORE = 'M0,60 C40,58 60,50 100,48 S160,52 200,46 S260,38 320,35';
const CHART_AFTER = 'M0,55 C40,48 60,35 100,30 S160,38 200,25 S260,15 320,10';
const CHART_FILL_BEFORE = `${CHART_BEFORE} L320,80 L0,80 Z`;
const CHART_FILL_AFTER = `${CHART_AFTER} L320,80 L0,80 Z`;

function useAnimatedValue(target: number, duration: number, active: boolean, decimals: number) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const from = value;
    const diff = target - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setValue(from + diff * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, active]);

  useEffect(() => {
    if (!active && target === 0) setValue(0);
  }, [active, target]);

  return decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString();
}

function KpiTile({ kpi, phase, index }: { kpi: KpiDef; phase: Phase; index: number }) {
  const isObserving = phase === 'observe' || phase === 'detect' || phase === 'act' || phase === 'pause';
  const isActing = phase === 'act' || phase === 'pause';
  const target = isActing ? kpi.after : (isObserving ? kpi.before : 0);
  const displayValue = useAnimatedValue(target, 1800, isObserving, kpi.decimals);
  const showChange = isActing && kpi.changeLabel;
  const isAmber = phase === 'detect' && kpi.isTarget;

  return (
    <div
      className={`p-3 rounded-xl border transition-all duration-500 ${
        isAmber
          ? 'mkt-pulse-amber border-amber-500/40 bg-amber-500/[0.06]'
          : 'border-white/[0.06] bg-white/[0.03]'
      }`}
      style={{
        opacity: phase === 'observe' ? 1 : 1,
        animationDelay: `${index * 0.15}s`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-500 ${
          isAmber ? 'bg-amber-500/20' : 'bg-violet-500/10'
        }`}>
          <kpi.icon className={`w-3 h-3 transition-colors duration-500 ${
            isAmber ? 'text-amber-400' : 'text-violet-400'
          }`} />
        </div>
        <span className="font-sans text-[10px] text-slate-500">{kpi.label}</span>
      </div>
      <div className="font-display text-lg sm:text-xl tracking-tight text-white">
        {kpi.prefix}{displayValue}{kpi.suffix}
      </div>
      <div className="h-4">
        {showChange && (
          <span className="font-sans text-[10px] text-emerald-400 animate-fade-in">
            {kpi.changeLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function DashboardMockup() {
  const [phase, setPhase] = useState<Phase>('observe');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const nextPhase = useCallback((current: Phase): Phase => {
    const order: Phase[] = ['observe', 'detect', 'act', 'pause'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase('pause');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setPhase((p) => nextPhase(p));
    }, PHASE_DURATIONS[phase]);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [phase, nextPhase, prefersReducedMotion]);

  const showLever = phase === 'detect' || phase === 'act' || phase === 'pause';
  const leverApplied = phase === 'act' || phase === 'pause';
  const showCursor = phase === 'act';
  const showScan = phase === 'detect';
  const chartIsAfter = phase === 'act' || phase === 'pause';

  return (
    <div className="mkt-perspective w-full max-w-4xl mx-auto">
      <div className="mkt-tilt mkt-glass rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/10 relative">
        {/* Scan line overlay */}
        {showScan && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-2xl">
            <div
              className="mkt-scan-line absolute inset-x-0 h-12"
              style={{
                background: 'linear-gradient(180deg, transparent, hsl(263 70% 55% / 0.12), transparent)',
              }}
            />
          </div>
        )}

        {/* Cursor overlay */}
        {showCursor && (
          <div
            className="absolute z-30 pointer-events-none mkt-cursor hidden sm:block"
            style={{
              bottom: '30%',
              left: '55%',
              '--cursor-dx': '60px',
              '--cursor-dy': '20px',
            } as React.CSSProperties}
          >
            <MousePointer2 className="w-5 h-5 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <span className="font-display text-[10px] tracking-[0.15em] text-slate-500 ml-2">
            COMMAND CENTER
          </span>
          {/* Phase indicator */}
          <div className="ml-auto flex items-center gap-1.5">
            {phase !== 'pause' && (
              <span className="font-sans text-[9px] text-violet-400/70 tracking-wider uppercase animate-fade-in">
                {phase === 'observe' && 'Observing…'}
                {phase === 'detect' && `${PLATFORM_NAME} detected an opportunity`}
                {phase === 'act' && 'Applying recommendation…'}
              </span>
            )}
            {phase !== 'pause' && (
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <KpiTile key={kpi.label} kpi={kpi} phase={phase} index={i} />
            ))}
          </div>

          {/* Chart + Lever Row */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* Area chart */}
            <div className="sm:col-span-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-[10px] tracking-[0.15em] text-slate-500">
                  WEEKLY REVENUE TREND
                </span>
                <span className="font-sans text-[10px] text-slate-600">Last 8 weeks</span>
              </div>
              <svg viewBox="0 0 320 80" className="w-full h-16 sm:h-20" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mkt-chart-fill-before" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(263 70% 55%)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="hsl(263 70% 55%)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="mkt-chart-fill-after" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152 60% 45%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(152 60% 45%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Before state */}
                <path
                  d={CHART_FILL_BEFORE}
                  fill="url(#mkt-chart-fill-before)"
                  className="transition-opacity duration-1000"
                  style={{ opacity: chartIsAfter ? 0 : 1 }}
                />
                <path
                  d={CHART_BEFORE}
                  fill="none"
                  stroke="hsl(263 70% 55%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                  style={{
                    opacity: chartIsAfter ? 0 : 1,
                    strokeDasharray: 500,
                    strokeDashoffset: phase === 'observe' ? 0 : 0,
                  }}
                />
                {/* After state */}
                <path
                  d={CHART_FILL_AFTER}
                  fill="url(#mkt-chart-fill-after)"
                  className="transition-opacity duration-1000"
                  style={{ opacity: chartIsAfter ? 1 : 0 }}
                />
                <path
                  d={CHART_AFTER}
                  fill="none"
                  stroke="hsl(152 60% 45%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-opacity duration-1000"
                  style={{ opacity: chartIsAfter ? 1 : 0 }}
                />
              </svg>
            </div>

            {/* Lever card */}
            <div
              className={`sm:col-span-2 p-4 rounded-xl border flex-col justify-between transition-all duration-700 hidden sm:flex ${
                showLever
                  ? leverApplied
                    ? 'bg-emerald-500/[0.06] border-emerald-500/[0.15] opacity-100 translate-y-0'
                    : 'bg-violet-500/[0.06] border-violet-500/[0.12] opacity-100 translate-y-0'
                  : 'bg-violet-500/[0.04] border-white/[0.06] opacity-0 translate-y-2'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  {leverApplied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Zap className="w-3 h-3 text-violet-400" />
                  )}
                  <span className={`font-display text-[10px] tracking-[0.15em] ${
                    leverApplied ? 'text-emerald-400' : 'text-violet-400'
                  }`}>
                    {leverApplied ? 'APPLIED' : 'PRIMARY LEVER'}
                  </span>
                </div>
                <p className="font-sans text-sm text-white/90 leading-snug">
                  Increase Tuesday utilization by 12% — projected $4,200/mo uplift
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1200 ${
                      leverApplied
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 w-full'
                        : showLever
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 mkt-confidence-fill'
                          : 'w-0'
                    }`}
                    style={leverApplied ? { width: '100%' } : undefined}
                  />
                </div>
                <span className="font-sans text-[10px] text-slate-500">
                  {leverApplied ? 'Complete' : 'High confidence'}
                </span>
              </div>
              {/* Apply button area */}
              {showLever && !leverApplied && (
                <div className="mt-3 flex justify-end">
                  <span className="font-display text-[10px] tracking-[0.12em] text-violet-400 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/10">
                    APPLY
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
