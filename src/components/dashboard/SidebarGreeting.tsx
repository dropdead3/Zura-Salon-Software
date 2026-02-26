import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarGreetingProps {
  greeting: string;
  subtitle?: string;
  firstName: string;
}

export function SidebarGreeting({ greeting, subtitle, firstName }: SidebarGreetingProps) {
  const [isVisible, setIsVisible] = useState(() => {
    return !sessionStorage.getItem('greeting-shown');
  });

  useEffect(() => {
    if (!isVisible) return;
    sessionStorage.setItem('greeting-shown', 'true');
    const timer = setTimeout(() => setIsVisible(false), 30000);
    return () => clearTimeout(timer);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border/40">
            <p className="text-sm font-display font-medium tracking-wide text-foreground">
              {greeting} <span className="text-foreground/70">{firstName}</span>
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
