import { PLATFORM_NAME } from '@/lib/brand';

export function PlatformPreview() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            One structured operational framework
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {PLATFORM_NAME} unifies intelligence, operations, and execution into one system.
          </p>
        </div>

        {/* Screenshot container with glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/10 rounded-3xl blur-[60px] -z-10" />
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-violet-500/10 bg-slate-900/50 aspect-[16/9] flex items-center justify-center">
            {/* Placeholder for dashboard screenshot */}
            <div className="text-center px-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <div className="w-8 h-8 rounded bg-violet-500/20" />
              </div>
              <p className="font-display text-sm tracking-[0.15em] text-slate-500">
                Command Center Preview
              </p>
              <p className="font-sans text-xs text-slate-600 mt-2">
                Dashboard screenshot coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
