import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Pause, 
  Play, 
  Trash2, 
  Plus,
  History,
  FileText,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Zap,
  Loader2,
} from 'lucide-react';
import { format as fmtDate, startOfMonth, endOfMonth } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { toast } from 'sonner';
import { 
  useScheduledReports, 
  useScheduledReportRuns,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useRunScheduledReportNow,
  useCompleteScheduledReportRun,
  type ScheduledReport 
} from '@/hooks/useScheduledReports';
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
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { ScheduleReportForm } from './ScheduleReportForm';
import { REPORT_CATALOG } from '@/config/reportCatalog';
import { useBatchReportGenerator, type BatchReportConfig } from '../batch/useBatchReportGenerator';

function ScheduleTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    first_of_month: '1st of Month',
    last_of_month: 'End of Month',
  };
  return <span>{labels[type] || type}</span>;
}

function StatusBadge({ isActive }: { isActive: boolean | null }) {
  if (isActive) {
    return (
      <Badge variant="default" className="bg-chart-2/20 text-chart-2 border-chart-2/30">
        <Play className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Pause className="w-3 h-3 mr-1" />
      Paused
    </Badge>
  );
}

export function ScheduledReportsSubTab() {
  const { formatDate } = useFormatDate();
  const { data: reports, isLoading } = useScheduledReports();
  const updateReport = useUpdateScheduledReport();
  const deleteReport = useDeleteScheduledReport();
  const runNow = useRunScheduledReportNow();
  const completeRun = useCompleteScheduledReportRun();
  const batchGenerator = useBatchReportGenerator();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyReportId, setHistoryReportId] = useState<string | null>(null);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { data: runHistory } = useScheduledReportRuns(historyReportId || undefined);

  const handleToggleActive = (report: ScheduledReport) => {
    updateReport.mutate({
      id: report.id,
      is_active: !report.is_active,
    });
  };

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setScheduleFormOpen(true);
  };

  const handleRunNow = async (report: ScheduledReport) => {
    const reportIds: string[] = report.filters?.report_ids || [];
    if (reportIds.length === 0) {
      toast.error('No reports configured in this schedule');
      return;
    }

    setRunningId(report.id);
    let runId: string | undefined;
    try {
      const result = await runNow.mutateAsync(report);
      runId = result.runId;

      const configs: BatchReportConfig[] = reportIds
        .map(id => {
          const entry = REPORT_CATALOG.find(r => r.id === id);
          return { reportId: id, reportName: entry?.name || id };
        });

      const now = new Date();
      const dateFrom = report.filters?.dateFrom || fmtDate(startOfMonth(now), 'yyyy-MM-dd');
      const dateTo = report.filters?.dateTo || fmtDate(endOfMonth(now), 'yyyy-MM-dd');

      await batchGenerator.generate({
        configs,
        dateFrom,
        dateTo,
        locationId: report.filters?.locationId,
        outputFormat: report.format === 'pdf-separate' ? 'zip' : 'merged',
      });

      await completeRun.mutateAsync({ runId, reportId: report.id, success: true });
      toast.success('Report pack generated and downloaded');
    } catch (err: any) {
      if (runId) {
        await completeRun.mutateAsync({ runId, reportId: report.id, success: false, errorMessage: err.message }).catch(() => {});
      }
      toast.error('Run failed', { description: err.message });
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteReport.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No Scheduled Reports</h3>
            <p className="text-muted-foreground mb-4">
              Create a scheduled report to automatically receive reports via email.
            </p>
            <Button onClick={() => { setEditingReport(null); setScheduleFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule a Report
            </Button>
          </CardContent>
        </Card>
        <ScheduleReportForm open={scheduleFormOpen} onOpenChange={setScheduleFormOpen} editReport={editingReport} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Scheduled Reports</h3>
          <p className="text-sm text-muted-foreground">
            {reports.length} report{reports.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={() => { setEditingReport(null); setScheduleFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <div className="space-y-4">
        {reports.map((report) => {
          const isRunning = runningId === report.id;
          return (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{report.name}</h4>
                      <StatusBadge isActive={report.is_active} />
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <ScheduleTypeLabel type={report.schedule_type} />
                        {report.schedule_config?.timeUtc && ` at ${report.schedule_config.timeUtc} UTC`}
                      </span>
                      
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {report.recipients?.length || 0} recipient{(report.recipients?.length || 0) !== 1 ? 's' : ''}
                      </span>
                      
                      {report.format && (
                        <Badge variant="outline" className="text-xs">
                          {report.format.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {report.last_run_at && (
                        <span>
                          Last run: {formatDistanceToNow(new Date(report.last_run_at), { addSuffix: true })}
                        </span>
                      )}
                      {report.next_run_at && report.is_active && (
                        <span>
                          Next: {formatDate(new Date(report.next_run_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size={tokens.button.inline}
                      onClick={() => handleRunNow(report)}
                      disabled={isRunning}
                      title="Run Now"
                    >
                      {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </Button>

                    <Button 
                      variant="ghost" 
                      size={tokens.button.inline}
                      onClick={() => handleEdit(report)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button 
                      variant="ghost" 
                      size={tokens.button.inline}
                      onClick={() => setHistoryReportId(report.id)}
                      title="History"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size={tokens.button.inline}
                      onClick={() => handleToggleActive(report)}
                      disabled={updateReport.isPending}
                      title={report.is_active ? 'Pause' : 'Resume'}
                    >
                      {report.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size={tokens.button.inline}
                      onClick={() => setDeleteId(report.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled report. Any pending deliveries will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Run History Sheet */}
      <PremiumFloatingPanel open={!!historyReportId} onOpenChange={(open) => !open && setHistoryReportId(null)} maxWidth="560px">
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase">Run History</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {runHistory?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No runs yet
            </p>
          ) : (
            runHistory?.map((run) => (
              <div 
                key={run.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                {run.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : run.status === 'failed' ? (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{run.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.started_at && formatDate(new Date(run.started_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  {run.error_message && (
                    <p className="text-xs text-destructive mt-1">{run.error_message}</p>
                  )}
                </div>
                {run.recipient_count && (
                  <Badge variant="outline" className="text-xs">
                    {run.recipient_count} sent
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </PremiumFloatingPanel>

      <ScheduleReportForm open={scheduleFormOpen} onOpenChange={setScheduleFormOpen} editReport={editingReport} />
    </div>
  );
}
