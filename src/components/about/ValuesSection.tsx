import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, Heart, Users, Palette, Sun } from "lucide-react";

const values = [
  {
    icon: Sparkles,
    title: "Structure First",
    description: "We believe structure protects operators. Every feature we build enforces clarity, not chaos.",
  },
  {
    icon: Heart,
    title: "Operator Empathy",
    description: "We've been in the chair, behind the desk, running payroll at midnight. We build for people we understand.",
  },
  {
    icon: Users,
    title: "Team Over Tools",
    description: "Software should make your team better — not replace the judgment of the people running the business.",
  },
  {
    icon: Palette,
    title: "Signal Over Noise",
    description: "We'd rather stay silent than surface a weak recommendation. High confidence or nothing.",
  },
  {
    icon: Sun,
    title: "Transparency Always",
    description: "Every insight comes with reasoning. Every recommendation shows its math. No black boxes.",
  },
];

export function ValuesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <p className="font-sans text-xs uppercase tracking-[0.15em] text-violet-400 mb-4">
            What We Stand For
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-white">
            Our Core Values
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {values.slice(0, 3).map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="p-6 lg:p-8 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
            >
              <div className="w-12 h-12 mx-auto mb-5 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <value.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-display text-sm tracking-wide text-white mb-3">{value.title}</h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 max-w-3xl mx-auto">
          {values.slice(3).map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: (index + 3) * 0.1 }}
              className="p-6 lg:p-8 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
            >
              <div className="w-12 h-12 mx-auto mb-5 rounded-xl bg-[hsl(var(--mkt-dusky)/0.1)] flex items-center justify-center">
                <value.icon className="w-5 h-5 text-[hsl(var(--mkt-dusky))]" />
              </div>
              <h3 className="font-display text-sm tracking-wide text-white mb-3">{value.title}</h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
