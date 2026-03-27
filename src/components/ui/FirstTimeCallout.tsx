import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FirstTimeCalloutProps {
  id: string;
  title: string;
  description: string;
  className?: string;
}

export function FirstTimeCallout({ id, title, description, className }: FirstTimeCalloutProps) {
  const storageKey = `zura_callout_dismissed_${id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.04] text-sm',
            className
          )}
        >
          <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-display text-[10px] tracking-[0.1em] uppercase text-blue-400/70 block mb-0.5">
              Page Explainer
            </span>
            <p className="font-display text-xs tracking-wide text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 p-0.5 rounded text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
