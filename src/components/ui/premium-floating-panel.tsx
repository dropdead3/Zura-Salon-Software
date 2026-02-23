import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { createPortal } from 'react-dom';

interface PremiumFloatingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
  backdropClassName?: string;
  zIndex?: number;
  /** Set false to hide the built-in close button (e.g. when the child provides its own) */
  showCloseButton?: boolean;
}

/**
 * Canonical premium floating bento panel.
 *
 * Glass morphism · spring physics · mobile-adaptive.
 * Use this as the single source of truth for all slide-in detail panels.
 */
export function PremiumFloatingPanel({
  open,
  onOpenChange,
  children,
  maxWidth = '440px',
  className,
  backdropClassName,
  zIndex = 50,
  showCloseButton = true,
}: PremiumFloatingPanelProps) {
  const isMobile = useIsMobile();

  const handleClose = () => onOpenChange(false);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="pfp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed inset-0 bg-black/20 backdrop-blur-sm',
              backdropClassName,
            )}
            style={{ zIndex: zIndex - 10 }}
            onClick={handleClose}
          />

          {/* Floating Panel */}
          <motion.div
            key="pfp-panel"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
            className={cn(
              'fixed border border-border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col',
              isMobile
                ? 'right-0 top-0 bottom-0 w-full max-w-none rounded-none'
                : 'right-4 top-4 bottom-4 w-[calc(100vw-2rem)] rounded-xl',
              className,
            )}
            style={{
              zIndex,
              maxWidth: isMobile ? 'none' : maxWidth,
            }}
          >
            {/* Close button */}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-muted/60 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
