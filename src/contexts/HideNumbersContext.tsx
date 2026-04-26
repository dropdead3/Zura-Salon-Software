import { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HideNumbersContextType {
  hideNumbers: boolean;
  toggleHideNumbers: () => void;
  requestUnhide: () => void;
  isLoading: boolean;
}

const HideNumbersContext = createContext<HideNumbersContextType | undefined>(undefined);

// Internal dialog component that uses context
function HideNumbersConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Reveal Financial Data?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Are you sure you want to show all numbers?</p>
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  This feature is to prevent sensitive financial data from being displayed
                  if logging in at the front desk or shared workstations.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Yes, Show Numbers
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Session-only privacy fence.
 *
 * `hideNumbers` defaults to `true` on every new session/tab and is held
 * exclusively in React state for the lifetime of the provider mount.
 * Reveal state is intentionally NOT persisted to the database, localStorage,
 * or site_settings — re-login or new tab re-blurs by default. This protects
 * front-desk and shared workstations from inheriting yesterday's revealed state.
 */
export function HideNumbersProvider({ children }: { children: ReactNode }) {
  const [hideNumbers, setHideNumbers] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Request to unhide via clicking a blurred value — shows confirmation dialog.
  const requestUnhide = () => {
    if (hideNumbers) {
      setShowConfirmDialog(true);
    }
  };

  const confirmUnhide = () => {
    setHideNumbers(false);
    setShowConfirmDialog(false);
  };

  // Toggle for header eye icon and `h` hotkey (explicit, no confirmation).
  const toggleHideNumbers = () => {
    setHideNumbers((prev) => !prev);
  };

  return (
    <HideNumbersContext.Provider
      value={{ hideNumbers, toggleHideNumbers, requestUnhide, isLoading: false }}
    >
      {children}
      <HideNumbersConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={confirmUnhide}
      />
    </HideNumbersContext.Provider>
  );
}

export function useHideNumbers() {
  const context = useContext(HideNumbersContext);
  if (context === undefined) {
    throw new Error('useHideNumbers must be used within a HideNumbersProvider');
  }
  return context;
}

// Utility component for blurring dollar amounts with click-to-reveal
interface BlurredAmountProps {
  children: ReactNode;
  className?: string;
  as?: 'span' | 'p' | 'div';
  disableTooltip?: boolean;
}

export function BlurredAmount({
  children,
  className,
  as: Component = 'span',
  disableTooltip = false,
}: BlurredAmountProps) {
  const { hideNumbers, requestUnhide } = useHideNumbers();

  // Wave 1: subtle crossfade on value change for premium "data is alive" feel.
  // Keyed on stringified children — when the formatted value changes, the span
  // re-mounts with a 220ms fade-in. Cheap, no framer-motion dep needed here.
  const valueKey = typeof children === 'string' || typeof children === 'number'
    ? String(children)
    : undefined;
  const animatedClass = valueKey !== undefined ? 'animate-fade-in-fast' : '';

  if (!hideNumbers) {
    return (
      <Component
        key={valueKey}
        className={cn(className, animatedClass)}
      >
        {children}
      </Component>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Component
            className={cn(className, 'blur-md select-none cursor-pointer transition-all duration-200')}
            tabIndex={0}
            onClick={requestUnhide}
            onKeyDown={(e) => e.key === 'Enter' && requestUnhide()}
          >
            {children}
          </Component>
        </TooltipTrigger>
        <TooltipContent>Click to reveal</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Legacy alias for backwards compatibility
export const BlurredNumber = BlurredAmount;
