import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
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
            'flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15 text-sm',
            className
          )}
        >
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs tracking-wide text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
