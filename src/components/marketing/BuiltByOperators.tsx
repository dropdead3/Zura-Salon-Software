import { Building2, TrendingUp, Shield, Users } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const markers = [
  { icon: Building2, text: 'Built while scaling from 1 to 12 locations' },
  { icon: TrendingUp, text: 'Designed for $1M–$50M operators' },
  { icon: Shield, text: 'Structure-first, not feature-first' },
  { icon: Users, text: 'By salon owners, for salon owners' },
];

export function BuiltByOperators() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Narrative */}
          <div className="mkt-reveal">
            <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
              Origin Story
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-6">
              Built by multi-location owners who lived the chaos
            </h2>
            <div className="space-y-4 font-sans text-base sm:text-lg text-slate-400 leading-relaxed">
              <p>
                We scaled a salon business from a single chair to twelve locations. Every tool we tried
                was built for booking — not for operating.
              </p>
              <p>
                {PLATFORM_NAME} is what we wished existed: an operating system that embeds
                structure into every workflow and surfaces the exact lever to pull next.
              </p>
            </div>
          </div>

          {/* Credibility markers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mkt-reveal" style={{ transitionDelay: '0.15s' }}>
            {markers.map((marker) => (
              <div
                key={marker.text}
                className="p-5 rounded-xl mkt-glass hover:bg-white/[0.05] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                  <marker.icon className="w-5 h-5 text-violet-400" />
                </div>
                <p className="font-sans text-sm text-slate-300 leading-relaxed">
                  {marker.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
