import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { PLATFORM_NAME } from '@/lib/brand';

interface DemoExitCTAProps {
  onTryAnother: () => void;
}

export function DemoExitCTA({ onTryAnother }: DemoExitCTAProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-md mx-auto text-center py-8"
    >
      <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-6 h-6 text-violet-400" />
        </div>
        <h3 className="font-display text-lg tracking-[0.08em] uppercase text-white mb-2">
          This is how {PLATFORM_NAME} works
        </h3>
        <p className="font-sans text-sm text-slate-400 mb-6 leading-relaxed">
          Want to see it with your real data? Get a personalized demo.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 h-11 px-7 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 rounded-full font-sans text-sm font-medium transition-all"
          >
            Get a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onTryAnother}
            className="inline-flex items-center gap-2 h-11 px-7 rounded-full border border-white/[0.1] text-slate-300 hover:border-white/[0.2] hover:bg-white/[0.03] font-sans text-sm font-medium transition-all"
          >
            Try another scenario
          </button>
        </div>
        <p className="font-sans text-xs text-slate-600 mt-4">Trusted by 50+ salon locations</p>
      </div>
    </motion.div>
  );
}
