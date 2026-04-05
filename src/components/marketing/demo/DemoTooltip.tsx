import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface DemoTooltipProps {
  text: string;
  visible: boolean;
  className?: string;
}

export function DemoTooltip({ text, visible, className = '' }: DemoTooltipProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 ${className}`}
        >
          <Lightbulb className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="font-sans text-sm text-slate-300 leading-relaxed">{text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
