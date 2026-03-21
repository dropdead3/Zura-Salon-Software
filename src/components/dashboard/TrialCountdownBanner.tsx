import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus, type UrgencyLevel } from '@/hooks/useTrialStatus';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';

const DISMISS_STORAGE_KEY = 'trial-banner-dismissed';

interface DismissState {
  dismissedAt: string;
  urgencyLevel: UrgencyLevel;
}

function getGradientClasses(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'critical':
    case 'expired':
      return 'from-red-600/20 via-rose-600/20 to-red-600/20 dark:from-red-900/40 dark:via-rose-900/40 dark:to-red-900/40 border-red-300 dark:border-red-700';
    case 'warning':
      return 'from-amber-600/20 via-orange-600/20 to-amber-600/20 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-amber-900/40 border-amber-300 dark:border-amber-700';
    default:
      return 'from-violet-600/20 via-purple-600/20 to-violet-600/20 dark:from-violet-900/40 dark:via-purple-900/40 dark:to-violet-900/40 border-violet-300 dark:border-violet-700';
  }
}

function getTextClasses(urgency: UrgencyLevel): { primary: string; secondary: string } {
  switch (urgency) {
    case 'critical':
    case 'expired':
      return {
        primary: 'text-red-800 dark:text-red-200',
        secondary: 'text-red-700 dark:text-red-300',
      };
    case 'warning':
      return {
        primary: 'text-amber-800 dark:text-amber-200',
        secondary: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        primary: 'text-violet-800 dark:text-violet-200',
        secondary: 'text-violet-700 dark:text-violet-300',
      };
  }
}

function getIconClasses(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'critical':
    case 'expired':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-violet-600 dark:text-violet-400';
  }
}

function getButtonClasses(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'critical':
    case 'expired':
      return 'bg-red-600 hover:bg-red-700 text-white';
    case 'warning':
      return 'bg-amber-600 hover:bg-amber-700 text-white';
    default:
      return 'bg-violet-600 hover:bg-violet-700 text-white';
  }
}

function formatCountdown(
  daysRemaining: number | null,
  hoursRemaining: number | null,
  isExpired: boolean
): string {
  if (isExpired) return 'Trial Expired';
  if (daysRemaining === null) return '';
  
  if (daysRemaining >= 8) {
    return `${daysRemaining} days remaining`;
  }
  
  if (daysRemaining >= 1) {
    const remainingHours = (hoursRemaining ?? 0) - (daysRemaining * 24);
    if (remainingHours > 0) {
      return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''} remaining`;
    }
    return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
  }
  
  // Less than 24 hours
  if (hoursRemaining !== null && hoursRemaining > 0) {
    return `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining`;
  }
  
  return 'Less than 1 hour remaining';
}

export function TrialCountdownBanner() {
  const { isInTrial, daysRemaining, hoursRemaining, urgencyLevel, isExpired, isLoading } = useTrialStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [countdownText, setCountdownText] = useState('');

  // Check dismiss state and reset if urgency increased
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (stored) {
        const state: DismissState = JSON.parse(stored);
        const urgencyOrder: UrgencyLevel[] = ['normal', 'warning', 'critical', 'expired'];
        const storedIndex = urgencyOrder.indexOf(state.urgencyLevel);
        const currentIndex = urgencyOrder.indexOf(urgencyLevel);
        
        // Show again if urgency increased
        if (currentIndex > storedIndex) {
          localStorage.removeItem(DISMISS_STORAGE_KEY);
          setIsDismissed(false);
        } else {
          setIsDismissed(true);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [urgencyLevel]);

  // Update countdown text
  useEffect(() => {
    const updateText = () => {
      setCountdownText(formatCountdown(daysRemaining, hoursRemaining, isExpired));
    };
    
    updateText();
    
    // Update frequency based on urgency
    const interval = urgencyLevel === 'critical' || (hoursRemaining !== null && hoursRemaining < 24)
      ? 1000 * 60 // Every minute for critical
      : 1000 * 60 * 10; // Every 10 minutes otherwise
    
    const timer = setInterval(updateText, interval);
    return () => clearInterval(timer);
  }, [daysRemaining, hoursRemaining, isExpired, urgencyLevel]);

  const handleDismiss = () => {
    const state: DismissState = {
      dismissedAt: new Date().toISOString(),
      urgencyLevel,
    };
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(state));
    setIsDismissed(true);
  };

  // Don't render if not in trial, expired and not showing, loading, or dismissed
  const shouldShow = useMemo(() => {
    if (isLoading) return false;
    if (!isInTrial && !isExpired) return false;
    if (isDismissed && !isExpired) return false; // Always show expired state
    return true;
  }, [isLoading, isInTrial, isExpired, isDismissed]);

  if (!shouldShow) return null;

  const gradientClasses = getGradientClasses(urgencyLevel);
  const textClasses = getTextClasses(urgencyLevel);
  const iconClasses = getIconClasses(urgencyLevel);
  const buttonClasses = getButtonClasses(urgencyLevel);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'relative bg-gradient-to-r rounded-xl p-4 shadow-lg border',
          gradientClasses,
          urgencyLevel === 'critical' && 'animate-pulse'
        )}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              urgencyLevel === 'expired' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-white/30 dark:bg-white/10'
            )}>
              {isExpired ? (
                <Clock className={cn('w-4 h-4', iconClasses)} />
              ) : (
                <Sparkles className={cn('w-4 h-4', iconClasses)} />
              )}
            </div>
            <div>
              <span className={cn('font-display text-sm tracking-wide', textClasses.primary)}>
                {isExpired ? '⚠️ TRIAL EXPIRED' : '✨ TRIAL PERIOD'}
              </span>
              <span className={cn('mx-2', textClasses.secondary)}>—</span>
              <span className={cn('font-mono text-sm font-medium tabular-nums', textClasses.secondary)}>
                {countdownText}
              </span>
            </div>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-2">
            <Button
              asChild
              size={tokens.button.card}
              className={cn('gap-1.5', buttonClasses)}
            >
              <Link to="/dashboard/settings/billing">
                {isExpired ? 'Contact Sales' : 'Upgrade Now'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
            
            {!isExpired && (
              <button
                onClick={handleDismiss}
                className={cn(
                  'p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
                  textClasses.secondary
                )}
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
