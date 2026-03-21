import { Info, Eye, EyeOff, Keyboard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { NextClientIndicator } from '@/components/dashboard/NextClientIndicator';
import { cn } from '@/lib/utils';

interface TopBarOverflowMenuProps {
  userId?: string;
  showNextClient?: boolean;
  hideNumbers: boolean;
  toggleHideNumbers: () => void;
  showThemeToggle?: boolean;
}

export function TopBarOverflowMenu({
  userId,
  showNextClient,
  hideNumbers,
  toggleHideNumbers,
  showThemeToggle,
}: TopBarOverflowMenuProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground transition-all duration-150"
              aria-label="More options"
            >
              <Info className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">More options</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-72 p-0 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border border-border/30 rounded-xl shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98]",
          "duration-200"
        )}
      >
        {/* System Context */}
        {showNextClient && (
          <div className="p-3 border-b border-border/15">
            <p className="font-display text-[10px] tracking-[0.12em] uppercase text-muted-foreground mb-2">
              System Context
            </p>
            <div className="bg-card-inner/30 rounded-lg p-2.5">
              <NextClientIndicator userId={userId} />
            </div>
          </div>
        )}

        {/* Display Controls */}
        <div className="p-3 border-b border-border/15">
          <p className="font-display text-[10px] tracking-[0.12em] uppercase text-muted-foreground mb-2">
            Display Controls
          </p>
          <div className="space-y-1">
            <button
              onClick={toggleHideNumbers}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-150 text-sm"
            >
              {hideNumbers ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              <span className="flex-1 text-left">{hideNumbers ? 'Show Numbers' : 'Hide Numbers'}</span>
            </button>
            {showThemeToggle && (
              <div className="flex items-center gap-3 px-2.5 py-2">
                <span className="text-sm text-muted-foreground flex-1">Theme</span>
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>

        {/* Admin Utilities */}
        <div className="p-3">
          <p className="font-display text-[10px] tracking-[0.12em] uppercase text-muted-foreground mb-2">
            Admin Utilities
          </p>
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-150 text-sm"
          >
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Keyboard Shortcuts</span>
            <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">?</kbd>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
