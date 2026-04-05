import { useEffect, useRef, useState } from 'react';
import { useScrollReveal } from './useScrollReveal';

const metrics = [
  { value: 84, prefix: '$', suffix: 'K', label: 'Recovered in first quarter', context: 'Average across multi-location owners' },
  { value: 23, suffix: '%', label: 'Average margin improvement', context: 'Service-level visibility drives recovery' },
  { value: 4.2, suffix: 'h', label: 'Saved per owner per week', context: 'Clear insights replace hours of manual review' },
  { value: 67, suffix: '%', label: 'Faster new-hire ramp', context: 'Step-by-step training replaces tribal knowledge' },
];

function AnimatedStat({ value, prefix, suffix }: { value: number; prefix?: string; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const elRef = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Number((eased * value).toFixed(value % 1 !== 0 ? 1 : 0)));
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
    <div ref={elRef} className="font-display text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight">
      {prefix}{display}{suffix}
    </div>
  );
}

export function OutcomeMetrics() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-24 lg:py-28">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent -z-10" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14 mkt-reveal">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            Outcomes
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight">
            Results salon owners are seeing
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-center">
          {metrics.map((metric, i) => (
            <div
              key={metric.label}
              className="mkt-reveal p-6 sm:p-8 rounded-2xl mkt-glass mkt-border-shimmer"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <AnimatedStat value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
              <p className="font-sans text-xs sm:text-sm text-slate-300 uppercase tracking-wide mt-3 mb-2">
                {metric.label}
              </p>
              <p className="font-sans text-xs text-slate-500">
                {metric.context}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
