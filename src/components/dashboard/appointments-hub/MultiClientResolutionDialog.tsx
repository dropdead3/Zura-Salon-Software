import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle, Users } from 'lucide-react';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { cn } from '@/lib/utils';

interface ClientGroup {
  clientId: string;
  clientName: string;
  customerNumber: string | null;
  appointments: any[];
}

function groupByClient(appointments: any[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  let unknownCounter = 0;

  for (const a of appointments) {
    const rawId = a._source === 'phorest' ? a.phorest_client_id : a.client_id;
    const clientId = rawId || `__walkin_${++unknownCounter}`;
    const isWalkin = !rawId;

    if (!map.has(clientId)) {
      map.set(clientId, {
        clientId,
        clientName: isWalkin ? 'Walk-in' : (a.client_name || 'Unknown'),
        customerNumber: a.customer_number || null,
        appointments: [],
      });
    }
    map.get(clientId)!.appointments.push(a);
  }

  return Array.from(map.values()).sort((a, b) => b.appointments.length - a.appointments.length);
}

function formatApptTime(a: any): string {
  const date = a.appointment_date
    ? format(parseISO(a.appointment_date), 'MM/dd')
    : '—';
  const time = a.start_time || '';
  return `${date} ${time}`.trim();
}

interface MultiClientResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: any[];
  actionLabel: string;
  actionVariant?: 'destructive' | 'default';
  onConfirm: (filteredAppointments: any[]) => void;
}

export function MultiClientResolutionDialog({
  open,
  onOpenChange,
  appointments,
  actionLabel,
  actionVariant = 'destructive',
  onConfirm,
}: MultiClientResolutionDialogProps) {
  const groups = useMemo(() => groupByClient(appointments), [appointments]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(groups.map(g => g.clientId)));

  // Reset checked state when dialog opens with new data
  useMemo(() => {
    setCheckedIds(new Set(groups.map(g => g.clientId)));
  }, [groups]);

  const toggleGroup = (clientId: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const filteredAppointments = useMemo(
    () => groups.filter(g => checkedIds.has(g.clientId)).flatMap(g => g.appointments),
    [groups, checkedIds],
  );

  const filteredCount = filteredAppointments.length;
  const canConfirm = filteredCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(DRILLDOWN_DIALOG_CONTENT_CLASS, 'max-w-md')} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/15">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="font-display text-base tracking-wide">Multiple Clients Detected</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Your selection includes appointments for {groups.length} different clients. Choose which to include.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-2 overflow-y-auto flex-1 space-y-2">
          {groups.map((group) => {
            const isChecked = checkedIds.has(group.clientId);
            return (
              <Collapsible key={group.clientId} defaultOpen>
                <div
                  className={cn(
                    'rounded-lg border transition-colors',
                    isChecked ? 'border-border bg-muted/30' : 'border-border/40 bg-muted/10 opacity-60',
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleGroup(group.clientId)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{group.clientName}</span>
                        {group.customerNumber && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                            {group.customerNumber}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {group.appointments.length} appt{group.appointments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 space-y-1 ml-9">
                      {group.appointments.map((appt: any) => (
                        <div key={appt.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatApptTime(appt)}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                            {appt.status || 'booked'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          <Button
            variant={actionVariant}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm(filteredAppointments);
              onOpenChange(false);
            }}
          >
            {actionLabel} ({filteredCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
