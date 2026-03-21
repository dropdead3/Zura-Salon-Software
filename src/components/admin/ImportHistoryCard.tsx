import { useState } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  AlertCircle,
  Undo,
  FlaskConical,
  Loader2,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportJob, useRollbackImport } from '@/hooks/useImportJobs';

interface ImportHistoryCardProps {
  job: ImportJob;
  showRollback?: boolean;
}

export function ImportHistoryCard({ job, showRollback = true }: ImportHistoryCardProps) {
  const { formatDate } = useFormatDate();
  const { mutate: rollback, isPending: isRollingBack } = useRollbackImport();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const progressPercent = job.total_rows 
    ? Math.round(((job.processed_rows || 0) / job.total_rows) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-amber-500';
      case 'rolled_back': return 'bg-slate-400';
      case 'dry_run': return 'bg-blue-400';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rolled_back': return 'Rolled Back';
      case 'dry_run': return 'Dry Run';
      default: return status;
    }
  };

  const canRollback = showRollback && 
    ['completed', 'failed'].includes(job.status) &&
    !job.rolled_back_at &&
    !job.is_dry_run;

  // Check if within 30 days
  const jobDate = new Date(job.created_at);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isWithinRollbackWindow = jobDate >= thirtyDaysAgo;

  const handleRollback = () => {
    rollback(job.id);
    setConfirmOpen(false);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className={cn("w-3 h-3 rounded-full", getStatusColor(job.status))} />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium capitalize">
              {job.entity_type} from {job.source_type}
            </p>
            {job.is_dry_run && (
              <Badge variant="secondary" className="text-xs">
                <FlaskConical className="w-3 h-3 mr-1" />
                Dry Run
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(new Date(job.created_at), 'MMM d, yyyy h:mm a')}
          </p>
          {job.rolled_back_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Undo className="w-3 h-3" />
              Rolled back {formatDate(new Date(job.rolled_back_at), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {job.status === 'processing' && (
          <div className="w-32">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {progressPercent}%
            </p>
          </div>
        )}

        {job.status === 'completed' && (
          <div className="text-right">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">
                {job.success_count} imported
              </span>
            </div>
            {(job.error_count || 0) > 0 && (
              <p className="text-xs text-amber-600">
                {job.error_count} failed
              </p>
            )}
          </div>
        )}

        {job.status === 'dry_run' && (
          <div className="text-right">
            <div className="flex items-center gap-2 text-blue-600">
              <FlaskConical className="w-4 h-4" />
              <span className="text-sm font-medium">
                {job.success_count} validated
              </span>
            </div>
            {(job.error_count || 0) > 0 && (
              <p className="text-xs text-amber-600">
                {job.error_count} would fail
              </p>
            )}
          </div>
        )}

        {job.status === 'failed' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed</span>
          </div>
        )}

        {job.status === 'rolled_back' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="w-4 h-4" />
            <span className="text-sm">Rolled Back</span>
          </div>
        )}

        <Badge variant="outline" className="capitalize">
          {getStatusLabel(job.status)}
        </Badge>

        {canRollback && isWithinRollbackWindow && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size={tokens.button.inline} 
                className="text-destructive hover:text-destructive"
                disabled={isRollingBack}
              >
                {isRollingBack ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Undo className="w-4 h-4 mr-1" />
                    Rollback
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Confirm Rollback
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This will permanently delete <strong>{job.success_count}</strong>{' '}
                    <strong className="capitalize">{job.entity_type}</strong> records that were
                    imported on {formatDate(new Date(job.created_at), 'MMM d, yyyy')} at{' '}
                    {formatDate(new Date(job.created_at), 'h:mm a')}.
                  </p>
                  <p className="text-destructive font-medium">
                    This action cannot be undone.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRollback}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm Rollback
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
