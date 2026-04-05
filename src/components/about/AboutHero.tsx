import { motion } from "framer-motion";

export function AboutHero() {
  return (
    <section className="relative z-10 px-6 sm:px-8 pt-20 pb-12 sm:pt-28 sm:pb-16 lg:pt-36 lg:pb-20">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="font-sans text-xs sm:text-sm text-[hsl(var(--mkt-lavender)/0.6)] uppercase tracking-[0.15em] mb-6">
            Our Story
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6 leading-[1.1]">
            Built by operators,{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              for operators
            </span>
          </h1>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We started in the salon chair. We know the chaos of managing people, product, and 
            profitability — because we lived it. Zura exists to give scaling operators the clarity 
            they deserve.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
