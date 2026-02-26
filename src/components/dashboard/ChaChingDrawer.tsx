import { useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { useChaChingHistory } from '@/hooks/useChaChingHistory';
import { SilverShineWrapper } from '@/components/ui/SilverShineWrapper';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChaChingDrawer() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useChaChingHistory();

  const handleOpen = () => {
    setOpen(true);
    markAllRead();
  };

  return (
    <>
      {/* Sticky tab — right edge */}
      <button
        onClick={handleOpen}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40',
          'flex items-center gap-1.5 px-2 py-3',
          'bg-card/80 backdrop-blur-xl border border-r-0 border-border/40',
          'rounded-l-xl shadow-lg',
          'hover:bg-card/90 transition-colors',
          'group'
        )}
        aria-label="Open cha-ching history"
      >
        <DollarSign className="w-4 h-4 text-success" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] text-success-foreground font-display">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* History drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="bg-card/80 backdrop-blur-xl border-border/40 p-0 w-[360px] sm:max-w-[360px]"
        >
          <SheetHeader className="p-5 pb-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <DollarSign className={tokens.card.icon} />
              </div>
              <div>
                <SheetTitle className="font-display text-sm tracking-wide uppercase">
                  Cha-Ching History
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {notifications.length} checkout{notifications.length !== 1 ? 's' : ''} this session
                </p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
            <div className="p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className={tokens.empty.container}>
                  <DollarSign className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No checkouts yet</h3>
                  <p className={tokens.empty.description}>
                    When clients check out, they'll appear here
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <SilverShineWrapper key={item.id} variant="card">
                    <div className="flex items-center gap-3 bg-card/80 backdrop-blur-xl rounded-xl p-3">
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
                    </div>
                  </SilverShineWrapper>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
