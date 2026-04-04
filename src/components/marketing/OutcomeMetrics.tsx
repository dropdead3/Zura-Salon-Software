import { useEffect, useRef, useState } from 'react';

const metrics = [
  { value: 23, suffix: '%', label: 'Average margin improvement' },
  { value: 4.2, suffix: 'h', label: 'Saved per operator per week' },
  { value: 89, suffix: '%', label: 'Operational drift reduction' },
];

function AnimatedStat({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
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
    <div ref={ref} className="font-display text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight">
      {display}{suffix}
    </div>
  );
}

export function OutcomeMetrics() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <AnimatedStat value={metric.value} suffix={metric.suffix} />
              <p className="font-sans text-xs sm:text-sm text-slate-400 uppercase tracking-wide mt-3">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
