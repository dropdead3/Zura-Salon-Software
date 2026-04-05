import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 50, suffix: '+', label: 'Locations Managed' },
  { value: 30, prefix: '$', suffix: 'M+', label: 'Revenue Monitored' },
  { value: 500, suffix: '+', label: 'Stylists on Platform' },
  { value: 12, suffix: ' → 1', label: 'Tools Replaced' },
];

function Counter({ value, prefix, suffix }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1400;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="font-display text-3xl sm:text-4xl tracking-tight text-white">
      {prefix}{display}{suffix}
    </span>
  );
}

export function StatBar() {
  return (
    <section className="relative z-10 border-y border-white/[0.06] py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <p className="font-sans text-xs sm:text-sm text-slate-500 uppercase tracking-[0.15em] text-center mb-8">
          Trusted by salon owners building real businesses
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 text-center">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`${i < stats.length - 1 ? 'sm:border-r sm:border-white/[0.06]' : ''}`}
            >
              <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              <p className="font-sans text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
