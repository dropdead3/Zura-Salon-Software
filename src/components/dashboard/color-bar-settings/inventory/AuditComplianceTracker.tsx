/**
 * AuditComplianceTracker — Shows audit schedule, compliance KPIs,
 * and allows marking audits complete or skipping them.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ClipboardCheck, CheckCircle2, XCircle, Clock, SkipForward, Plus, CalendarCheck } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { format, isPast, differenceInDays } from 'date-fns';
import {
  useAuditSchedule,
  useMarkAuditComplete,
  useSkipAudit,
  useGenerateNextAudit,
  type AuditScheduleEntry,
} from '@/hooks/inventory/useAuditSchedule';
import { useInventoryAlertSettings } from '@/hooks/useInventoryAlertSettings';

interface AuditComplianceTrackerProps {
  locationId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  completed: { label: 'Completed', variant: 'default', icon: CheckCircle2 },
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  overdue: { label: 'Overdue', variant: 'destructive', icon: XCircle },
  skipped: { label: 'Skipped', variant: 'outline', icon: SkipForward },
};

export function AuditComplianceTracker({ locationId }: AuditComplianceTrackerProps) {
  const { data: audits = [], isLoading } = useAuditSchedule({ limit: 20 });
  const { data: settings } = useInventoryAlertSettings();
  const markComplete = useMarkAuditComplete();
  const skipAudit = useSkipAudit();
  const generateNext = useGenerateNextAudit();

  const [skipDialogAudit, setSkipDialogAudit] = useState<AuditScheduleEntry | null>(null);
  const [skipReason, setSkipReason] = useState('');

  // Mark overdue entries visually
  const enrichedAudits = useMemo(() => {
    return audits.map(a => {
      if (a.status === 'pending' && isPast(new Date(a.due_date + 'T23:59:59'))) {
        return { ...a, status: 'overdue' };
      }
      return a;
    });
  }, [audits]);

  // Compliance KPIs (last 6 months)
  const kpis = useMemo(() => {
    const recent = enrichedAudits.filter(a => a.status !== 'pending');
    const completed = recent.filter(a => a.status === 'completed');
    const onTime = completed.filter(a => {
      if (!a.completed_at) return false;
      return differenceInDays(new Date(a.completed_at), new Date(a.due_date)) <= 0;
    });

    const complianceRate = recent.length > 0 ? Math.round((completed.length / recent.length) * 100) : 0;
    const onTimeRate = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0;

    // Streak: consecutive completed from most recent
    let streak = 0;
    for (const a of enrichedAudits) {
      if (a.status === 'completed') streak++;
      else if (a.status !== 'pending') break;
    }

    return { complianceRate, onTimeRate, streak, totalCompleted: completed.length, total: recent.length };
  }, [enrichedAudits]);

  const handleMarkComplete = (auditId: string) => {
    markComplete.mutate({ auditId });
  };

  const handleSkip = () => {
    if (!skipDialogAudit || !skipReason.trim()) return;
    skipAudit.mutate({ auditId: skipDialogAudit.id, reason: skipReason.trim() }, {
      onSuccess: () => {
        setSkipDialogAudit(null);
        setSkipReason('');
      },
    });
  };

  const handleScheduleNext = () => {
    generateNext.mutate({
      frequency: settings?.audit_frequency ?? 'monthly',
      locationId,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className={tokens.body.emphasis}>Audit Schedule</p>
          <p className={tokens.body.muted}>Track periodic inventory audits and backroom manager compliance.</p>
        </div>
        <Button size="sm" onClick={handleScheduleNext} disabled={generateNext.isPending} className={tokens.button.cardAction}>
          {generateNext.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Schedule Next Audit
        </Button>
      </div>

      {/* KPI Strip */}
      {kpis.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <span className={tokens.kpi.label}>Compliance Rate</span>
            <span className={tokens.kpi.value}>{kpis.complianceRate}%</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <span className={tokens.kpi.label}>On-Time Rate</span>
            <span className={tokens.kpi.value}>{kpis.onTimeRate}%</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <span className={tokens.kpi.label}>Current Streak</span>
            <span className={tokens.kpi.value}>{kpis.streak}</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <span className={tokens.kpi.label}>Total Completed</span>
            <span className={tokens.kpi.value}>{kpis.totalCompleted}</span>
          </div>
        </div>
      )}

      {/* Audit List */}
      {enrichedAudits.length === 0 ? (
        <div className={tokens.empty.container}>
          <CalendarCheck className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No audits scheduled</h3>
          <p className={tokens.empty.description}>Schedule your first inventory audit to start tracking compliance.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Due Date</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')}>Completed</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell')}>Notes</TableHead>
                  <TableHead className={tokens.table.columnHeader}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedAudits.map((audit) => {
                  const config = STATUS_CONFIG[audit.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;
                  const isActionable = audit.status === 'pending' || audit.status === 'overdue';
                  const daysLate = audit.completed_at
                    ? differenceInDays(new Date(audit.completed_at), new Date(audit.due_date))
                    : null;

                  return (
                    <TableRow key={audit.id}>
                      <TableCell className={tokens.body.emphasis}>
                        {format(new Date(audit.due_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1 text-[10px]">
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {audit.completed_at ? (
                          <div className="space-y-0.5">
                            <span className="text-xs">{format(new Date(audit.completed_at), 'MMM d, yyyy')}</span>
                            {daysLate !== null && daysLate > 0 && (
                              <Badge variant="outline" className="text-[9px] text-destructive ml-1">
                                {daysLate}d late
                              </Badge>
                            )}
                            {daysLate !== null && daysLate <= 0 && (
                              <Badge variant="outline" className="text-[9px] text-primary ml-1">
                                On time
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {audit.notes || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isActionable && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="default"
                              size="sm"
                              className={tokens.button.inline}
                              onClick={() => handleMarkComplete(audit.id)}
                              disabled={markComplete.isPending}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Complete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={tokens.button.inline}
                              onClick={() => { setSkipDialogAudit(audit); setSkipReason(''); }}
                            >
                              <SkipForward className="w-3.5 h-3.5" />
                              Skip
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Skip reason dialog */}
      <Dialog open={!!skipDialogAudit} onOpenChange={(open) => { if (!open) setSkipDialogAudit(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className={tokens.card.title}>Skip Audit</DialogTitle>
            <DialogDescription>
              Provide a reason for skipping the audit due {skipDialogAudit ? format(new Date(skipDialogAudit.due_date), 'MMM d, yyyy') : ''}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder="Reason for skipping this audit…"
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSkipDialogAudit(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleSkip}
              disabled={!skipReason.trim() || skipAudit.isPending}
            >
              {skipAudit.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Skip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
