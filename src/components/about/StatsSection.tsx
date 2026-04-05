import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useCounterAnimation } from "@/hooks/use-counter-animation";

const stats = [
  { value: 5, suffix: "+", label: "Years Building" },
  { value: 200, suffix: "+", label: "Locations Served" },
  { value: 10, suffix: "K+", label: "Stylists Empowered" },
  { value: 99, suffix: "%", label: "Uptime" },
];

function StatItem({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-50px" });
  const { count, ref: counterRef } = useCounterAnimation({ 
    end: value, 
    duration: 2000,
    startOnView: false 
  });

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl lg:text-6xl font-display mb-2 text-[hsl(var(--mkt-lavender))]">
        <span ref={counterRef}>{isInView ? count : 0}</span>{suffix}
      </div>
      <p className="font-sans text-sm uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </motion.div>
  );
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28 border-y border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <p className="font-sans text-xs uppercase tracking-[0.15em] text-[hsl(var(--mkt-dusky))] mb-4">
            By The Numbers
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-white">
            Our Impact
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <StatItem
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              delay={index * 0.15}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
