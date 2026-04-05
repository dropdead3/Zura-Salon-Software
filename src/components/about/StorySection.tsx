import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const milestones = [
  {
    year: "2019",
    title: "The Spark",
    description: "Born from the frustration of running a multi-location salon with spreadsheets and gut instinct. We knew there had to be a better way.",
  },
  {
    year: "2021",
    title: "First Platform",
    description: "Launched the first version of Zura to a handful of salon owners who were tired of flying blind.",
  },
  {
    year: "2023",
    title: "Intelligence Layer",
    description: "Added the Weekly Intelligence Brief — turning raw data into ranked, actionable levers for operators.",
  },
  {
    year: "2025",
    title: "Scaling Up",
    description: "Now serving operators across hundreds of locations, with simulation and automation on the horizon.",
  },
];

export function StorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <p className="font-sans text-xs uppercase tracking-[0.15em] text-[hsl(var(--mkt-lavender)/0.6)] mb-4">
            Our Journey
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-white">
            How We Got Here
          </h2>
        </motion.div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-white/[0.08] md:-translate-x-px" />

          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.year}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`relative flex items-start gap-6 md:gap-12 mb-12 last:mb-0 ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Timeline dot */}
              <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-violet-500 rounded-full -translate-x-1/2 mt-1.5 z-10" />

              {/* Content */}
              <div className={`flex-1 pl-10 md:pl-0 ${index % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
                <span className="inline-block font-sans text-xs uppercase tracking-wider text-[hsl(var(--mkt-dusky))] mb-2">
                  {milestone.year}
                </span>
                <h3 className="font-display text-base tracking-wide text-white mb-2">{milestone.title}</h3>
                <p className="font-sans text-sm text-slate-400 leading-relaxed">
                  {milestone.description}
                </p>
              </div>

              {/* Spacer for alternating layout */}
              <div className="hidden md:block flex-1" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
