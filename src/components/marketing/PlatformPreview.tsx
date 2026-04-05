import { PLATFORM_NAME } from '@/lib/brand';
import { DashboardMockup } from './DashboardMockup';
import { useScrollReveal } from './useScrollReveal';

export function PlatformPreview() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 mkt-reveal">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Real intelligence. Not another dashboard.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {PLATFORM_NAME} unifies intelligence, operations, and execution into one structured system.
          </p>
        </div>

        <div className="relative mkt-reveal" style={{ transitionDelay: '0.15s' }}>
          <div className="absolute inset-0 bg-violet-500/10 rounded-3xl blur-[60px] -z-10" />
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
