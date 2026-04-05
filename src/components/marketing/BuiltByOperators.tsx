import { Users, TrendingUp, DollarSign, Heart } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const markers = [
  { icon: Users, number: '80+', label: 'stylists managed' },
  { icon: TrendingUp, number: '12', label: 'locations scaled' },
  { icon: DollarSign, number: '$8M+', label: 'revenue operated' },
  { icon: Heart, number: 'Zero', label: 'outside investors' },
];

export function BuiltByOperators() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      {/* Gradient separator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[hsl(var(--mkt-dusky)/0.2)] to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Narrative */}
          <div className="mkt-reveal">
            <p className="font-display text-[11px] sm:text-xs text-[hsl(var(--mkt-lavender)/0.6)] uppercase tracking-[0.15em] mb-4">
              Built for how salons actually run
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-6">
              We didn't study salons. We ran them.
            </h2>
            <div className="space-y-4 font-sans text-base sm:text-lg text-slate-400 leading-relaxed">
              <p>
                We managed payroll for 80+ stylists. We tracked margin across 12 locations on spreadsheets.
                We lost top talent because we couldn't show them a growth path.
              </p>
              <p>
                {PLATFORM_NAME} is what happens when salon owners
                stop waiting for software companies to understand their business.
              </p>
            </div>
            {/* Stat callout */}
            <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <span className="font-display text-2xl text-violet-400">12</span>
              <span className="font-sans text-sm text-slate-400">years of salon operations<br />distilled into one platform</span>
            </div>
          </div>

          {/* Credibility markers */}
          <div className="space-y-5 mkt-reveal" style={{ transitionDelay: '0.15s' }}>
            {markers.map((marker) => (
              <div
                key={marker.label}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--mkt-dusky)/0.1)] flex items-center justify-center shrink-0">
                  <marker.icon className="w-5 h-5 text-[hsl(var(--mkt-dusky))]" />
                </div>
                <p className="font-sans text-base text-slate-300">
                  <span className="text-[hsl(var(--mkt-lavender))] font-medium">{marker.number}</span>{' '}
                  {marker.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
