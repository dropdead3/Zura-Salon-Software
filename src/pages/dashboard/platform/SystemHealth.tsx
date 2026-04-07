import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  Database,
  Mail,
  Phone,
  Globe,
  HardDrive,
  Zap,
  Server,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useSystemHealth, useRefreshSystemHealth } from '@/hooks/useSystemHealth';
import { useLatestJobRuns, useJobStats } from '@/hooks/useEdgeFunctionLogs';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';
import { useInfrastructureMetrics, useRefreshInfrastructureMetrics, type InfraMetric } from '@/hooks/useInfrastructureMetrics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageExplainer } from '@/components/ui/PageExplainer';

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  supabase: Database,
  phorest: Globe,
  resend: Mail,
  callrail: Phone,
};

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Down' },
  unknown: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Unknown' },
};

export default function SystemHealthPage() {
  const { data: health, isLoading, refetch, isFetching } = useSystemHealth();
  const { data: latestRuns } = useLatestJobRuns();
  const { syncLabel } = usePOSProviderLabel();
  const { data: stats } = useJobStats(24);
  const refreshHealth = useRefreshSystemHealth();
  const { data: infra, isLoading: infraLoading, refetch: refetchInfra } = useInfrastructureMetrics();
  const refreshInfra = useRefreshInfrastructureMetrics();

  const handleRefresh = async () => {
    try {
      await refreshHealth();
      await refetch();
      toast.success('Health check completed');
    } catch (error) {
      toast.error('Failed to refresh health status');
    }
  };

  const overallConfig = STATUS_CONFIG[health?.overallStatus || 'unknown'];
  const OverallIcon = overallConfig.icon;

  // Calculate sync stats
  const totalRuns = Object.values(stats || {}).reduce((sum, s) => sum + s.totalRuns24h, 0);
  const totalErrors = Object.values(stats || {}).reduce((sum, s) => sum + s.errorCount, 0);

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="System Health"
        description="Monitor platform services and integrations"
        actions={
          <PlatformButton 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
        <PageExplainer pageId="platform-system-health" />
            Refresh
          </PlatformButton>
        }
      />

      {/* Overall Status Banner */}
      <div className={cn(
        "rounded-xl border p-6 flex items-center justify-between",
        health?.overallStatus === 'healthy' && "border-emerald-500/30 bg-emerald-500/10",
        health?.overallStatus === 'degraded' && "border-amber-500/30 bg-amber-500/10",
        health?.overallStatus === 'down' && "border-rose-500/30 bg-rose-500/10",
        !health && "border-slate-700/50 bg-slate-800/40"
      )}>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="h-12 w-12 rounded-full bg-slate-700/50" />
          ) : (
            <div className={cn("p-3 rounded-full", overallConfig.bg)}>
              <OverallIcon className={cn("h-6 w-6", overallConfig.color)} />
            </div>
          )}
          <div>
            <h2 className="text-xl font-medium text-white">
              {isLoading ? (
                <Skeleton className="h-6 w-32 bg-slate-700/50" />
              ) : (
                health?.overallStatus === 'healthy' 
                  ? 'All Systems Operational' 
                  : health?.overallStatus === 'degraded'
                    ? 'Partial Outage'
                    : health?.overallStatus === 'down'
                      ? 'Major Outage'
                      : 'Checking Status...'
              )}
            </h2>
            <p className="text-sm text-slate-400">
              {health?.lastChecked 
                ? `Last checked ${formatDistanceToNow(health.lastChecked, { addSuffix: true })}`
                : 'No recent health check'
              }
            </p>
          </div>
        </div>

        <Badge className={cn(overallConfig.bg, overallConfig.color, "text-sm px-3 py-1")}>
          {overallConfig.label}
        </Badge>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">External Services</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-700/50 rounded-xl" />
            ))
          ) : health?.services.length === 0 ? (
            // Show placeholder services if none in DB
            ['Supabase', 'Phorest', 'Resend', 'CallRail'].map((name) => (
              <ServiceCard
                key={name}
                name={name}
                status="unknown"
                responseTime={null}
                lastChecked={null}
              />
            ))
          ) : (
            health?.services.map(service => (
              <ServiceCard
                key={service.service_name}
                name={service.service_name}
                status={service.status}
                responseTime={service.response_time_ms}
                lastChecked={service.last_checked_at}
                error={service.error_message}
              />
            ))
          )}
        </div>
      </div>

      {/* Sync Status */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Sync Status</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Last {syncLabel}</span>
              {health?.syncStatus.phorestStatus === 'success' && (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              )}
              {health?.syncStatus.phorestStatus === 'failed' && (
                <XCircle className="h-4 w-4 text-rose-400" />
              )}
              {health?.syncStatus.phorestStatus === 'running' && (
                <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
              )}
            </div>
            <p className="text-lg font-medium text-white">
              {health?.syncStatus.lastPhorestSync 
                ? formatDistanceToNow(health.syncStatus.lastPhorestSync, { addSuffix: true })
                : 'Never'
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Jobs (24h)</span>
              <Activity className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-lg font-medium text-white">{totalRuns} runs</p>
            <p className="text-xs text-slate-500">
              {((totalRuns - totalErrors) / Math.max(totalRuns, 1) * 100).toFixed(1)}% success rate
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Failed Jobs (24h)</span>
              {totalErrors > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              )}
            </div>
            <p className={cn(
              "text-lg font-medium",
              totalErrors > 0 ? "text-amber-400" : "text-white"
            )}>
              {totalErrors}
            </p>
          </div>
        </div>
      </div>

      {/* Queues */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Queue Status</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Pending Imports</span>
              <Database className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-medium text-white">
              {health?.queues.pendingImports || 0}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Pending Emails</span>
              <Mail className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-2xl font-medium text-white">
              {health?.queues.pendingEmails || 0}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Failed Jobs</span>
              {(health?.queues.failedJobs || 0) > 0 ? (
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              )}
            </div>
            <p className={cn(
              "text-2xl font-medium",
              (health?.queues.failedJobs || 0) > 0 ? "text-rose-400" : "text-white"
            )}>
              {health?.queues.failedJobs || 0}
            </p>
          </div>
        </div>
      </div>
    </PlatformPageContainer>
  );
}

function ServiceCard({ 
  name, 
  status, 
  responseTime, 
  lastChecked,
  error 
}: { 
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime: number | null;
  lastChecked: string | null;
  error?: string | null;
}) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const ServiceIcon = SERVICE_ICONS[name.toLowerCase()] || Globe;

  return (
    <div className={cn(
      "rounded-xl border bg-slate-800/40 p-4",
      status === 'healthy' && "border-slate-700/50",
      status === 'degraded' && "border-amber-500/30",
      status === 'down' && "border-rose-500/30",
      status === 'unknown' && "border-slate-700/50"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-700/50">
            <ServiceIcon className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <h4 className="font-medium text-white capitalize">{name}</h4>
            {responseTime !== null && (
              <p className="text-xs text-slate-500">{responseTime}ms response</p>
            )}
          </div>
        </div>

        <Badge className={cn(config.bg, config.color, "text-xs")}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-400 truncate">{error}</p>
      )}

      {lastChecked && (
        <p className="mt-2 text-xs text-slate-500">
          Checked {formatDistanceToNow(new Date(lastChecked), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
