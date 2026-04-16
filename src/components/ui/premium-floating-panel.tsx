import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { createPortal } from 'react-dom';

type PanelSide = 'right' | 'left' | 'bottom';

interface PremiumFloatingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  className?: string;
  backdropClassName?: string;
  zIndex?: number;
  /** Set false to hide the built-in close button (e.g. when the child provides its own) */
  showCloseButton?: boolean;
  /** Which edge the panel slides in from. Defaults to 'right'. */
  side?: PanelSide;
}

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

function getAnimationProps(side: PanelSide) {
  switch (side) {
    case 'left':
      return { initial: { opacity: 0, x: -80 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -80 } };
    case 'bottom':
      return { initial: { opacity: 0, y: 300 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 300 } };
    case 'right':
    default:
      return { initial: { opacity: 0, x: 80 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 80 } };
  }
}

function getPositionClasses(side: PanelSide, isMobile: boolean): string {
  if (isMobile) {
    if (side === 'bottom') {
      return 'bottom-0 left-0 right-0 w-full rounded-t-xl';
    }
    // left & right go full-screen on mobile
    return 'right-0 top-0 bottom-0 w-full max-w-none rounded-none';
  }

  switch (side) {
    case 'left':
      return 'left-4 top-4 bottom-4 w-[calc(100vw-2rem)] rounded-xl';
    case 'bottom':
      return 'bottom-0 left-0 right-0 w-full rounded-t-xl';
    case 'right':
    default:
      return 'right-4 top-4 bottom-4 w-[calc(100vw-2rem)] rounded-xl';
  }
}

/**
 * Canonical premium floating bento panel.
 *
 * Glass morphism · spring physics · mobile-adaptive.
 * Use this as the single source of truth for all slide-in detail panels.
 *
 * Supports `side` prop: 'right' (default), 'left', 'bottom'.
 */
export function PremiumFloatingPanel({
  open,
  onOpenChange,
  children,
  maxWidth = '440px',
  maxHeight,
  className,
  backdropClassName,
  zIndex = 50,
  showCloseButton = true,
  side = 'right',
}: PremiumFloatingPanelProps) {
  const isMobile = useIsMobile();
  const { isImpersonating } = useOrganizationContext();

  const handleClose = () => onOpenChange(false);

  const animProps = getAnimationProps(side);
  const posClasses = getPositionClasses(side, isMobile);

  // For bottom panels, maxWidth is irrelevant; use maxHeight instead
  const isBottom = side === 'bottom';

  // God Mode bar offset: 44px bar height
  const godModeOffset = isImpersonating ? 44 : 0;

  // Compute top style for non-bottom panels
  const panelTopStyle = isBottom
    ? undefined
    : isMobile
      ? `${godModeOffset}px`        // mobile: flush with bar (or 0)
      : `${godModeOffset + 16}px`;  // desktop: 16px gap below bar (or top-4)

  // Backdrop top offset so it doesn't cover the God Mode bar
  const backdropTopStyle = godModeOffset > 0 ? `${godModeOffset}px` : undefined;

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
              'fixed inset-0 bg-black/40 backdrop-blur-md',
              backdropClassName,
            )}
            style={{ zIndex: zIndex - 10, top: backdropTopStyle }}
            onClick={handleClose}
          />

          {/* Floating Panel */}
          <motion.div
            key="pfp-panel"
            {...animProps}
            transition={SPRING}
            className={cn(
              'fixed border border-border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col',
              posClasses,
              className,
            )}
            style={{
              zIndex,
              ...(panelTopStyle ? { top: panelTopStyle } : {}),
              ...(isBottom
                ? { maxHeight: isMobile ? undefined : (maxHeight || '85vh') }
                : { maxWidth: isMobile ? 'none' : maxWidth }),
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

            {/* Bottom panel drag handle */}
            {isBottom && (
              <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted shrink-0" />
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
