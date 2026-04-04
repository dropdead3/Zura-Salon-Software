export function LogoBar() {
  // Placeholder logos — replace with real org logos when available
  const logos = [
    'Salon A', 'Salon B', 'Salon C', 'Salon D', 'Salon E', 'Salon F',
  ];

  return (
    <section className="relative z-10 border-y border-white/[0.06] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 text-center">
        <p className="font-sans text-xs sm:text-sm text-slate-500 uppercase tracking-[0.15em] mb-8">
          Trusted by operators managing millions in annual revenue
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {logos.map((name) => (
            <div
              key={name}
              className="h-8 px-4 flex items-center justify-center rounded bg-white/[0.03] border border-white/[0.04] opacity-40 hover:opacity-80 transition-opacity"
            >
              <span className="font-display text-xs tracking-[0.15em] text-slate-400">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
