import { Brain, Megaphone, FlaskConical, Cog } from 'lucide-react';
import {
  EXECUTIVE_BRIEF_NAME,
  MARKETING_OS_NAME,
  SIMULATION_ENGINE_NAME,
  AUTOMATION_LAYER_NAME,
  PLATFORM_NAME,
} from '@/lib/brand';

const surfaces = [
  {
    icon: Brain,
    name: EXECUTIVE_BRIEF_NAME,
    shortName: 'Intelligence Brief',
    description: 'Weekly executive decision briefing. Ranked levers, deviation alerts, and recommended actions.',
    phase: 'Live',
  },
  {
    icon: Megaphone,
    name: MARKETING_OS_NAME,
    shortName: 'Marketing OS',
    description: 'Campaign generation with ROI attribution. Demand amplification governed by operational readiness.',
    phase: 'Phase 2',
  },
  {
    icon: FlaskConical,
    name: SIMULATION_ENGINE_NAME,
    shortName: 'Simulation Engine',
    description: 'What-if modeling before you act. Test pricing, staffing, and expansion scenarios.',
    phase: 'Phase 3',
  },
  {
    icon: Cog,
    name: AUTOMATION_LAYER_NAME,
    shortName: 'Automation',
    description: 'Guardrailed actions executed within constraints. Automation assists leadership, never replaces it.',
    phase: 'Phase 4',
  },
];

export function EcosystemPreview() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="font-display text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            Ecosystem
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Infrastructure that compounds
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Four interconnected surfaces. Each one multiplies the value of the others.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {surfaces.map((surface) => (
            <div
              key={surface.shortName}
              className="p-6 sm:p-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:border-violet-500/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                  <surface.icon className="w-5 h-5 text-violet-400" />
                </div>
                {surface.phase !== 'Live' && (
                  <span className="font-display text-xs text-slate-500 uppercase tracking-wide">
                    {surface.phase}
                  </span>
                )}
              </div>
              <h3 className="font-display text-sm sm:text-base tracking-wide mb-3">
                {surface.shortName}
              </h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">
                {surface.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
