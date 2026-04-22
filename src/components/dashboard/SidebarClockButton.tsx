import { Clock, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTimeClock } from '@/hooks/useTimeClock';
import { cn } from '@/lib/utils';

interface SidebarClockButtonProps {
  isCollapsed?: boolean;
  inFooter?: boolean;
}

export function SidebarClockButton({ isCollapsed = false, inFooter = true }: SidebarClockButtonProps) {
  const { isClockedIn, isLoading, clockIn, clockOut, isClockingIn, isClockingOut, todayTotalHours } = useTimeClock();

  const busy = isClockingIn || isClockingOut || isLoading;

  const handleClick = () => {
    if (busy) return;
    if (isClockedIn) {
      clockOut({});
    } else {
      clockIn({ source: 'sidebar' });
    }
  };

  const label = isClockedIn ? 'Clock Out' : 'Clock In';

  const buttonContent = (
    <button
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "flex items-center gap-3 text-sm font-sans cursor-pointer w-full",
        "transition-all duration-200 ease-out", isCollapsed ? "rounded-full" : "rounded-lg",
        isCollapsed
          ? cn("px-2 py-2.5 justify-center", inFooter ? "mx-0" : "mx-2")
          : cn("px-3 py-2.5", inFooter ? "mx-0" : "mx-3"),
        isClockedIn
          ? "text-success-foreground hover:bg-success/30"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/10",
        busy && "opacity-60 pointer-events-none"
      )}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
      ) : (
        <Clock className={cn("w-4 h-4 shrink-0", isClockedIn && "text-success-foreground")} />
      )}
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {isClockedIn && todayTotalHours > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {todayTotalHours}h
            </span>
          )}
        </>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex justify-center">
            {buttonContent}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="font-sans">
          {label}
          {isClockedIn && todayTotalHours > 0 && ` (${todayTotalHours}h today)`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
