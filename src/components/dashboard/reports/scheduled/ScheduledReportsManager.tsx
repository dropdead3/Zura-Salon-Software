import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Calendar, 
  Mail, 
  MoreVertical,
  Trash2,
  Edit,
  Pause,
  Play,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useScheduledReports, useScheduledReportRuns, useUpdateScheduledReport, useDeleteScheduledReport } from '@/hooks/useScheduledReports';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduledReportsManagerProps {
  onScheduleNew: () => void;
}

export function ScheduledReportsManager({ onScheduleNew }: ScheduledReportsManagerProps) {
  const { formatDate } = useFormatDate();
  const { data: reports, isLoading } = useScheduledReports();
  const updateReport = useUpdateScheduledReport();
  const deleteReport = useDeleteScheduledReport();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const handleToggleActive = (id: string, currentlyActive: boolean) => {
    updateReport.mutate({ id, is_active: !currentlyActive });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteReport.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getScheduleLabel = (type: string, config?: any): string => {
    switch (type) {
      case 'daily':
        return `Daily at ${config?.timeUtc || '9:00 AM'}`;
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Every ${days[config?.dayOfWeek || 1]} at ${config?.timeUtc || '9:00 AM'}`;
      case 'monthly':
      case 'first_of_month':
        return `1st of each month`;
      case 'last_of_month':
        return `Last day of each month`;
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Scheduled Reports</h2>
          <p className="text-sm text-muted-foreground">
            Automate report delivery on a recurring schedule
          </p>
        </div>
        <Button onClick={onScheduleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Report
        </Button>
      </div>

      {/* Reports List */}
      {reports?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No scheduled reports</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up automatic report delivery to your inbox
            </p>
            <Button onClick={onScheduleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports?.map(report => (
            <Card key={report.id} className={!report.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{report.name}</h3>
                      <Badge variant={report.is_active ? 'default' : 'secondary'}>
                        {report.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {getScheduleLabel(report.schedule_type, report.schedule_config)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {(report.format || 'pdf').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
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

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size={tokens.button.inline} className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setHistoryId(report.id)}>
                        <History className="w-4 h-4 mr-2" />
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(report.id, !!report.is_active)}>
                        {report.is_active ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(report.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History Dialog */}
      <ReportHistoryDialog 
        reportId={historyId}
        onClose={() => setHistoryId(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled report. Past run history will also be removed.
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
    </div>
  );
}

function ReportHistoryDialog({ reportId, onClose }: { reportId: string | null; onClose: () => void }) {
  const { data: runs, isLoading } = useScheduledReportRuns(reportId || undefined);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={!!reportId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Run History</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : runs?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No runs yet
            </p>
          ) : (
            <div className="space-y-3">
              {runs?.map(run => (
                <div key={run.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getStatusIcon(run.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm capitalize">{run.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {run.started_at && new Date(run.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    {run.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">{run.error_message}</p>
                    )}
                    {run.recipient_count && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent to {run.recipient_count} recipient{run.recipient_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
