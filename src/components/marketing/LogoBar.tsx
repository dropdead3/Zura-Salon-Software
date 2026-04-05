const integrations = [
  'Phorest', 'Google Calendar', 'Square', 'Stripe', 'QuickBooks', 'Mailchimp', 'Instagram', 'Meta Ads', 'TikTok',
];

export function LogoBar() {
  // Double the list for seamless infinite scroll
  const scrollItems = [...integrations, ...integrations];

  return (
    <section className="relative z-10 border-y border-white/[0.06] py-10 sm:py-14 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 text-center mb-8">
        <p className="font-sans text-xs sm:text-sm text-slate-500 uppercase tracking-[0.15em]">
          Integrates with the tools you already use
        </p>
      </div>

      {/* Infinite scroll track */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

        <div className="flex animate-logo-scroll">
          {scrollItems.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="shrink-0 mx-4 sm:mx-6 h-9 px-5 flex items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.06] opacity-50 hover:opacity-90 transition-opacity"
            >
              <span className="font-display text-[11px] tracking-[0.12em] text-slate-400 whitespace-nowrap">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
