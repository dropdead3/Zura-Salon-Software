import { TrendingUp, Zap, BarChart3, Users } from 'lucide-react';

const kpis = [
  { label: 'Revenue', value: '$284K', change: '+12%', icon: TrendingUp },
  { label: 'Utilization', value: '87%', change: '+4%', icon: BarChart3 },
  { label: 'Active Clients', value: '2,847', change: '+8%', icon: Users },
  { label: 'Margin', value: '34.2%', change: '+2.1%', icon: Zap },
];

export function DashboardMockup() {
  return (
    <div className="mkt-perspective w-full max-w-4xl mx-auto">
      <div className="mkt-tilt mkt-glass rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/10">
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
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                    <kpi.icon className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-sans text-[10px] text-slate-500">{kpi.label}</span>
                </div>
                <div className="font-display text-lg sm:text-xl tracking-tight text-white">
                  {kpi.value}
                </div>
                <span className="font-sans text-[10px] text-emerald-400">{kpi.change}</span>
              </div>
            ))}
          </div>

          {/* Chart + Lever Row */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* Faux area chart */}
            <div className="sm:col-span-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-[10px] tracking-[0.15em] text-slate-500">
                  WEEKLY REVENUE TREND
                </span>
                <span className="font-sans text-[10px] text-slate-600">Last 8 weeks</span>
              </div>
              {/* SVG area chart */}
              <svg viewBox="0 0 320 80" className="w-full h-16 sm:h-20" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mkt-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(263 70% 55%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(263 70% 55%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 C40,55 60,40 100,35 S160,45 200,30 S260,20 320,15 L320,80 L0,80 Z"
                  fill="url(#mkt-chart-fill)"
                />
                <path
                  d="M0,60 C40,55 60,40 100,35 S160,45 200,30 S260,20 320,15"
                  fill="none"
                  stroke="hsl(263 70% 55%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Lever card */}
            <div className="sm:col-span-2 p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.12] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span className="font-display text-[10px] tracking-[0.15em] text-violet-400">
                    PRIMARY LEVER
                  </span>
                </div>
                <p className="font-sans text-sm text-white/90 leading-snug">
                  Increase Tuesday utilization by 12% — projected $4,200/mo uplift
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                </div>
                <span className="font-sans text-[10px] text-slate-500">High confidence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
