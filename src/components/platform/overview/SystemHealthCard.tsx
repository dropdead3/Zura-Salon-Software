import { Link } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ArrowRight
} from 'lucide-react';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useJobStats } from '@/hooks/useEdgeFunctionLogs';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Down' },
  unknown: { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Unknown' },
};

export function SystemHealthCard() {
  const { data: health, isLoading } = useSystemHealth();
  const { data: stats } = useJobStats(24);

  const overallConfig = STATUS_CONFIG[health?.overallStatus || 'unknown'];
  const OverallIcon = overallConfig.icon;

  // Calculate job stats
  const totalRuns = Object.values(stats || {}).reduce((sum, s) => sum + s.totalRuns24h, 0);
  const totalErrors = Object.values(stats || {}).reduce((sum, s) => sum + s.errorCount, 0);

  if (isLoading) {
    return (
      <div className="rounded-[16px] border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="h-10 w-10 rounded-xl bg-slate-700/50" />
          <Skeleton className="h-6 w-32 bg-slate-700/50" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full bg-slate-700/50" />
          <Skeleton className="h-4 w-3/4 bg-slate-700/50" />
          <Skeleton className="h-4 w-1/2 bg-slate-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-[16px] border backdrop-blur-xl p-5 transition-all",
      health?.overallStatus === 'healthy' && "border-emerald-500/30 bg-emerald-500/5",
      health?.overallStatus === 'degraded' && "border-amber-500/30 bg-amber-500/5",
      health?.overallStatus === 'down' && "border-rose-500/30 bg-rose-500/5",
      !health?.overallStatus && "border-slate-700/50 bg-slate-800/40"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-xl", overallConfig.bg)}>
            <OverallIcon className={cn("h-4 w-4", overallConfig.color)} />
          </div>
          <h2 className="text-lg font-medium text-white">System Health</h2>
        </div>
        <Badge className={cn(overallConfig.bg, overallConfig.color, "text-xs")}>
          {overallConfig.label}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="space-y-3">
        {/* Services */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">External Services</span>
          <div className="flex items-center gap-2">
            {health?.services.length === 0 ? (
              <span className="text-slate-500">No data</span>
            ) : (
              <>
                <span className="text-emerald-400">
                  {health?.services.filter(s => s.status === 'healthy').length || 0}
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-300">{health?.services.length || 0}</span>
                <span className="text-slate-500">healthy</span>
              </>
            )}
          </div>
        </div>

        {/* Jobs */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Jobs (24h)</span>
          <div className="flex items-center gap-2">
            <span className="text-white">{totalRuns}</span>
            <span className="text-slate-500">runs</span>
            {totalErrors > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400">{totalErrors}</span>
                <span className="text-slate-500">errors</span>
              </>
            )}
          </div>
        </div>

        {/* Queues */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Pending Work</span>
          <div className="flex items-center gap-2">
            <span className="text-white">{health?.queues.pendingImports || 0}</span>
            <span className="text-slate-500">imports</span>
            {(health?.queues.failedJobs || 0) > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">{health?.queues.failedJobs}</span>
                <span className="text-slate-500">failed</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Details Link */}
      <Link 
        to="/platform/health"
        className="mt-5 flex items-center justify-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
      >
        View Details
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
