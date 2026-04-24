import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
  SelectValue,
} from '@/components/platform/ui/PlatformSelect';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  PlatformAlertDialogCancel as AlertDialogCancel,
  PlatformAlertDialogContent as AlertDialogContent,
  PlatformAlertDialogDescription as AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  PlatformAlertDialogTitle as AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/platform/ui/PlatformDialog';
import { toast } from 'sonner';
import { 
  useLatestJobRuns, 
  useJobStats, 
  useEdgeFunctionLogs,
  useTriggerJob,
  JOB_CONFIG, 
  JOB_CATEGORIES,
  type EdgeFunctionLog 
} from '@/hooks/useEdgeFunctionLogs';
import { cn } from '@/lib/utils';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function JobsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const { data: latestRuns, isLoading: runsLoading, refetch } = useLatestJobRuns();
  const { data: stats } = useJobStats(24);
  const triggerJob = useTriggerJob();

  // Calculate summary stats
  const totalRuns = Object.values(stats || {}).reduce((sum, s) => sum + s.totalRuns24h, 0);
  const totalErrors = Object.values(stats || {}).reduce((sum, s) => sum + s.errorCount, 0);

  // Group jobs by category
  const jobsByCategory = Object.entries(JOB_CONFIG).reduce((acc, [name, config]) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push({ name, ...config });
    return acc;
  }, {} as Record<string, Array<{ name: string; schedule: string; category: string; description: string }>>);

  // Filter categories
  const filteredCategories = categoryFilter === 'all' 
    ? Object.keys(jobsByCategory) 
    : [categoryFilter];

  const handleTriggerJob = async (functionName: string) => {
    try {
      await triggerJob.mutateAsync(functionName);
      toast.success(`Job "${functionName}" triggered successfully`);
    } catch (error) {
      toast.error(`Failed to trigger job: ${error}`);
    }
  };

  const getStatusInfo = (status?: EdgeFunctionLog['status']) => {
    switch (status) {
      case 'running':
        return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' };
      case 'success':
        return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Success' };
      case 'error':
        return { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Failed' };
      case 'timeout':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Timeout' };
      default:
        return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Idle' };
    }
  };

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Scheduled Jobs"
        description="Monitor and manage background tasks"
        actions={
          <PlatformButton 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
        <PageExplainer pageId="platform-jobs" />
            Refresh
          </PlatformButton>
        }
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Last 24h Runs</span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-medium text-white">{totalRuns}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Success Rate</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-medium text-emerald-400">
            {totalRuns > 0 ? (((totalRuns - totalErrors) / totalRuns) * 100).toFixed(1) : 100}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Errors (24h)</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className={cn("mt-2 text-2xl font-medium", totalErrors > 0 ? "text-rose-400" : "text-white")}>
            {totalErrors}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-600">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(JOB_CATEGORIES).map(([key, cat]) => (
              <SelectItem key={key} value={key}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-slate-800/50 border-slate-600">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job Categories */}
      {runsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-slate-700/50 rounded-xl" />
          ))}
        </div>
      ) : (
        filteredCategories.map(category => {
          const catInfo = JOB_CATEGORIES[category as keyof typeof JOB_CATEGORIES];
          const jobs = jobsByCategory[category] || [];
          
          // Filter by status if set
          const filteredJobs = statusFilter === 'all' 
            ? jobs 
            : jobs.filter(job => {
                const lastRun = latestRuns?.[job.name];
                return lastRun?.status === statusFilter;
              });

          if (filteredJobs.length === 0) return null;

          const colorClasses = {
            blue: 'border-blue-500/30 bg-blue-500/10',
            violet: 'border-violet-500/30 bg-violet-500/10',
            emerald: 'border-emerald-500/30 bg-emerald-500/10',
            amber: 'border-amber-500/30 bg-amber-500/10',
          };

          return (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  catInfo?.color === 'blue' && "bg-blue-500",
                  catInfo?.color === 'violet' && "bg-violet-500",
                  catInfo?.color === 'emerald' && "bg-emerald-500",
                  catInfo?.color === 'amber' && "bg-amber-500",
                )} />
                {catInfo?.label || category}
              </h2>

              <div className="space-y-2">
                {filteredJobs.map(job => {
                  const lastRun = latestRuns?.[job.name];
                  const jobStats = stats?.[job.name];
                  const statusInfo = getStatusInfo(lastRun?.status);
                  const StatusIcon = statusInfo.icon;
                  const isExpanded = expandedJob === job.name;

                  return (
                    <Collapsible 
                      key={job.name} 
                      open={isExpanded}
                      onOpenChange={(open) => setExpandedJob(open ? job.name : null)}
                    >
                      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-medium text-white">{job.name}</h3>
                                <Badge className={cn(statusInfo.bg, statusInfo.color, "font-normal")}>
                                  <StatusIcon className={cn(
                                    "h-3 w-3 mr-1",
                                    lastRun?.status === 'running' && "animate-spin"
                                  )} />
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">{job.description}</p>
                              <p className="text-xs text-slate-500 mt-1">{job.schedule}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right mr-4">
                                <p className="text-sm text-slate-300">
                                  {lastRun 
                                    ? `Last: ${formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}`
                                    : 'Never run'
                                  }
                                </p>
                                {jobStats && (
                                  <p className="text-xs text-slate-500">
                                    Success rate: {jobStats.totalRuns24h > 0 
                                      ? ((jobStats.successCount / jobStats.totalRuns24h) * 100).toFixed(0) 
                                      : 100}%
                                  </p>
                                )}
                              </div>

                              <CollapsibleTrigger asChild>
                                <PlatformButton variant="ghost" size="sm">
                                  <History className="h-4 w-4 mr-1" />
                                  History
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 ml-1" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </PlatformButton>
                              </CollapsibleTrigger>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <PlatformButton 
                                    variant="outline" 
                                    size="sm"
                                    disabled={triggerJob.isPending}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Run Now
                                  </PlatformButton>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-slate-700">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Trigger Job Manually?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will immediately execute "{job.name}". 
                                      Are you sure you want to proceed?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleTriggerJob(job.name)}
                                      className="bg-violet-600 hover:bg-violet-700"
                                    >
                                      Run Job
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <JobHistory functionName={job.name} />
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </PlatformPageContainer>
  );
}

function JobHistory({ functionName }: { functionName: string }) {
  const { data: logs, isLoading } = useEdgeFunctionLogs(functionName, 10);

  if (isLoading) {
    return (
      <div className="border-t border-slate-700/50 p-4">
        <Skeleton className="h-24 bg-slate-700/50" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="border-t border-slate-700/50 p-4 text-center text-slate-500 text-sm">
        No execution history available
      </div>
    );
  }

  return (
    <div className="border-t border-slate-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/30">
            <th className="text-left px-4 py-2 text-slate-400 font-medium">Time</th>
            <th className="text-left px-4 py-2 text-slate-400 font-medium">Status</th>
            <th className="text-left px-4 py-2 text-slate-400 font-medium">Duration</th>
            <th className="text-left px-4 py-2 text-slate-400 font-medium">Triggered By</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const statusColors = {
              success: 'text-emerald-400',
              error: 'text-rose-400',
              timeout: 'text-amber-400',
              running: 'text-blue-400',
            };

            return (
              <tr key={log.id} className="border-b border-slate-700/20">
                <td className="px-4 py-2 text-slate-300">
                  {format(new Date(log.started_at), 'MMM d, h:mm:ss a')}
                </td>
                <td className={cn("px-4 py-2 capitalize", statusColors[log.status])}>
                  {log.status}
                </td>
                <td className="px-4 py-2 text-slate-300">
                  {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : '-'}
                </td>
                <td className="px-4 py-2 text-slate-400 capitalize">
                  {log.triggered_by}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
