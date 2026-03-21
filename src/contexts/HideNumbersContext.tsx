import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  quickHide: () => void;
  isLoading: boolean;
}

const HideNumbersContext = createContext<HideNumbersContextType | undefined>(undefined);

// Internal dialog component that uses context
function HideNumbersConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm 
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

export function HideNumbersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Start hidden by default for security
  const [hideNumbers, setHideNumbers] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // On login/mount, load persisted preference from database
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const loadPreference = async () => {
      try {
        const { data } = await supabase
          .from('employee_profiles')
          .select('hide_numbers')
          .eq('user_id', user.id)
          .single();
        
        // Use persisted value, default to hidden if no record
        setHideNumbers(data?.hide_numbers ?? true);
      } catch (err) {
        console.error('Error loading hide_numbers preference:', err);
        setHideNumbers(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreference();
  }, [user]);

  // Request to unhide - shows confirmation dialog
  const requestUnhide = () => {
    if (hideNumbers) {
      setShowConfirmDialog(true);
    }
  };

  // Called when user confirms in dialog
  const confirmUnhide = async () => {
    setHideNumbers(false);
    setShowConfirmDialog(false);
    
    // Persist to database
    if (user) {
      try {
        await supabase
          .from('employee_profiles')
          .update({ hide_numbers: false })
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error saving hide_numbers preference:', err);
      }
    }
  };

  // Toggle for header eye icon (bypasses confirmation since it's explicit)
  const toggleHideNumbers = async () => {
    if (!user) return;

    const newValue = !hideNumbers;
    
    // If revealing, show confirmation dialog instead
    if (hideNumbers) {
      setShowConfirmDialog(true);
      return;
    }
    
    // If hiding, do it directly
    setHideNumbers(newValue);

    // Persist to database
    try {
      await supabase
        .from('employee_profiles')
        .update({ hide_numbers: newValue })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error saving hide_numbers preference:', err);
      // Revert on error
      setHideNumbers(!newValue);
    }
  };

  // Quick hide - called on double-click, immediately hides without confirmation
  const quickHide = async () => {
    if (!user || hideNumbers) return; // Already hidden or not logged in
    
    setHideNumbers(true);
    
    // Persist to database
    try {
      await supabase
        .from('employee_profiles')
        .update({ hide_numbers: true })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error saving hide_numbers preference:', err);
    }
  };

  return (
    <HideNumbersContext.Provider value={{ hideNumbers, toggleHideNumbers, requestUnhide, quickHide, isLoading }}>
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
}

export function BlurredAmount({ 
  children, 
  className,
  as: Component = 'span'
}: BlurredAmountProps) {
  const { hideNumbers, requestUnhide, quickHide } = useHideNumbers();
  
  const handleDoubleClick = () => {
    if (!hideNumbers) {
      quickHide();
    }
  };
  
  if (!hideNumbers) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Component 
              className={cn(className, 'cursor-pointer')} 
              onDoubleClick={handleDoubleClick}
            >
              {children}
            </Component>
          </TooltipTrigger>
          <TooltipContent>Double-click to hide</TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
