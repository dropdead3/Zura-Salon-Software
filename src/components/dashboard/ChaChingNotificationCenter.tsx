import { useState, useRef, useEffect, useCallback } from 'react';
import { DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { useChaChingHistory } from '@/hooks/useChaChingHistory';
import { SilverShineWrapper } from '@/components/ui/SilverShineWrapper';
import { motion, AnimatePresence } from 'framer-motion';

const VISIBLE_COUNT = 3;

const cardVariants = {
  initial: { opacity: 0, x: 60, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 } },
  exit: { opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.18 } },
};

export function ChaChingNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { notifications, unreadCount, markAllRead, dismissNotification, clearAll } = useChaChingHistory();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        markAllRead();
        setExpanded(false);
      }
      return !prev;
    });
  }, [markAllRead]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleItems = expanded ? notifications : notifications.slice(0, VISIBLE_COUNT);
  const hiddenCount = notifications.length - VISIBLE_COUNT;

  return (
    <div ref={panelRef}>
      {/* Sticky tab — right edge */}
      <button
        onClick={handleToggle}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40',
          'flex items-center gap-1.5 px-2 py-3',
          'bg-card/80 backdrop-blur-xl border border-r-0 border-border/40',
          'rounded-l-xl shadow-lg',
          'hover:bg-card/90 transition-colors',
        )}
        aria-label="Toggle cha-ching notifications"
      >
        <DollarSign className="w-4 h-4 text-success" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] text-success-foreground font-display">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification stack */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 top-20 z-50 w-[340px] flex flex-col gap-2"
          >
            {notifications.length === 0 ? (
              <motion.div {...cardVariants}>
                <SilverShineWrapper variant="card">
                  <div className="flex flex-col items-center gap-2 bg-card/80 backdrop-blur-xl rounded-xl p-5">
                    <DollarSign className={tokens.empty.icon} />
                    <p className={tokens.empty.heading}>No checkouts yet</p>
                    <p className={tokens.empty.description}>
                      When clients check out, they'll appear here
                    </p>
                  </div>
                </SilverShineWrapper>
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <SilverShineWrapper variant="card">
                        <div className="group flex items-center gap-3 bg-card/80 backdrop-blur-xl rounded-xl p-3 relative">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-base tabular-nums text-foreground">
                              {formatCurrency(item.amount)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatRelativeTime(item.timestamp)}
                            </p>
                          </div>
                          <span className="text-lg" aria-hidden>💰</span>
                          {/* Dismiss button on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(item.id);
                            }}
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
                            aria-label="Dismiss"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </SilverShineWrapper>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Grouped summary / expand toggle */}
                {!expanded && hiddenCount > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={() => setExpanded(true)}
                    className="w-full bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl p-3 text-center text-xs text-muted-foreground hover:bg-card/80 transition-colors"
                  >
                    <span className="font-display tracking-wide uppercase">
                      + {hiddenCount} more checkout{hiddenCount !== 1 ? 's' : ''}
                    </span>
                  </motion.button>
                )}

                {/* Clear all */}
                {notifications.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      clearAll();
                      setOpen(false);
                    }}
                    className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
                  >
                    Clear All
                  </motion.button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
