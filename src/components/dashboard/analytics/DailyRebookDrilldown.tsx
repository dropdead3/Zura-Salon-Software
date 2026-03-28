import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStaffRebookDrilldown } from '@/hooks/useStaffRebookDrilldown';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';

interface DailyRebookDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
}

export function DailyRebookDrilldown({ open, onOpenChange, locationId }: DailyRebookDrilldownProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: staff, isLoading, isError } = useStaffRebookDrilldown(today, locationId);

  const totalMissed = staff?.reduce((sum, s) => sum + s.todayMissed, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-base tracking-wide">
                REBOOK DETAIL — TODAY
              </DialogTitle>
              <DialogDescription className="font-sans text-sm text-muted-foreground mt-1">
                {isLoading ? '...' : `${totalMissed} missed rebook${totalMissed !== 1 ? 's' : ''} today`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-2">
            {isLoading && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </>
            )}

            {isError && (
              <div className="flex items-center gap-2 text-destructive text-sm py-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Failed to load rebook data.</span>
              </div>
            )}

            {!isLoading && !isError && staff && staff.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No completed appointments today.
              </p>
            )}

            {!isLoading && !isError && staff?.map((s) => (
              <div
                key={s.staffId}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-sans text-sm truncate">{s.name}</p>
                  <p className={cn(
                    'font-sans text-xs mt-0.5',
                    s.todayMissed > 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {s.todayRebooked} of {s.todayCompleted} rebooked
                    {s.todayMissed > 0 && ` · ${s.todayMissed} missed`}
                  </p>
                </div>
                <div
                  className={cn(
                    'shrink-0 ml-3 px-2.5 py-1 rounded-full text-xs font-sans tabular-nums',
                    s.thirtyDayRate >= 50
                      ? 'bg-success/10 text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s.thirtyDayRate.toFixed(0)}% 30d
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
