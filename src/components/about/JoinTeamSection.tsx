import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Zap, Shield, Heart } from "lucide-react";

const reasons = [
  { icon: Users, title: "Small Team, Big Impact", desc: "Every person here shapes the product. Your work matters from day one." },
  { icon: Zap, title: "Move Fast", desc: "We ship weekly. No bureaucracy, no endless meetings — just meaningful work." },
  { icon: Shield, title: "Real Problems", desc: "We solve hard operational problems for real business owners. Not ads. Not engagement hacks." },
  { icon: Heart, title: "Operator DNA", desc: "We hire people who've been in the arena. Industry experience is a superpower here." },
];

export function JoinTeamSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-sans text-xs uppercase tracking-[0.15em] text-violet-400 mb-4">
            Careers
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-white mb-4">
            Build the Future of Salon Operations
          </h2>
          <p className="font-sans text-base text-slate-400 max-w-xl mx-auto">
            We're looking for people who care about solving real problems for real operators.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <reason.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-display text-sm tracking-wide text-white mb-2">{reason.title}</h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">{reason.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-base font-medium text-white transition-all shadow-lg shadow-violet-500/20"
          >
            Get in Touch
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
