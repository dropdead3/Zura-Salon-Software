import { useQuery } from "@tanstack/react-query";
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { formatRelativeTime } from '@/lib/format';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Database, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface DataSourceHealth {
  name: string;
  syncType: string;
  lastSync: Date | null;
  status: 'healthy' | 'stale' | 'error' | 'unknown';
  recordsSynced: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
  updateFrequency: string;
  hasGaps: boolean;
  gapDetails?: string;
}

const DATA_SOURCES = [
  { 
    name: 'Appointments', 
    syncType: 'appointments', 
    updateFrequency: 'Every 5 minutes',
    staleThreshold: 15 // minutes
  },
  { 
    name: 'Sales Transactions', 
    syncType: 'sales', 
    updateFrequency: 'Every hour',
    staleThreshold: 120 // minutes
  },
  { 
    name: 'Staff Data', 
    syncType: 'staff', 
    updateFrequency: 'Daily at 6:00 AM',
    staleThreshold: 1500 // minutes (25 hours)
  },
  { 
    name: 'Performance Reports', 
    syncType: 'reports', 
    updateFrequency: 'Daily at 6:05 AM',
    staleThreshold: 1500 // minutes
  },
];

export function DataHealthSection() {
  const { formatNumber } = useFormatNumber();
  const { data: syncLogs, isLoading } = useQuery({
    queryKey: ['data-health-sync-logs'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data, error } = await supabase
        .from('phorest_sync_log')
        .select('sync_type, status, completed_at, started_at, records_synced, error_message')
        .gte('started_at', sevenDaysAgo)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const dataSourceHealth: DataSourceHealth[] = DATA_SOURCES.map(source => {
    const typeLogs = syncLogs?.filter(log => log.sync_type === source.syncType) || [];
    const successLogs = typeLogs.filter(log => log.status === 'success');
    const failureLogs = typeLogs.filter(log => log.status === 'failed');
    
    const lastSuccessLog = successLogs[0];
    const lastFailureLog = failureLogs[0];
    const lastSync = lastSuccessLog?.completed_at ? new Date(lastSuccessLog.completed_at) : null;
    
    // Calculate success rate
    const successRate = typeLogs.length > 0 
      ? Math.round((successLogs.length / typeLogs.length) * 100) 
      : 0;
    
    // Calculate total records synced
    const recordsSynced = successLogs.reduce((sum, log) => sum + (log.records_synced || 0), 0);
    
    // Calculate trend
    const oneDayAgo = subDays(new Date(), 1);
    const twoDaysAgo = subDays(new Date(), 2);
    const recentSuccess = successLogs.filter(log => new Date(log.started_at) > oneDayAgo).length;
    const previousSuccess = successLogs.filter(log => {
      const date = new Date(log.started_at);
      return date > twoDaysAgo && date <= oneDayAgo;
    }).length;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentSuccess > previousSuccess) trend = 'up';
    if (recentSuccess < previousSuccess) trend = 'down';
    
    // Determine status
    let status: 'healthy' | 'stale' | 'error' | 'unknown' = 'unknown';
    if (typeLogs.length === 0) {
      status = 'unknown';
    } else if (lastSync) {
      const minutesAgo = (Date.now() - lastSync.getTime()) / (1000 * 60);
      if (minutesAgo > source.staleThreshold) {
        status = 'stale';
      } else if (successRate >= 90) {
        status = 'healthy';
      } else if (successRate >= 50) {
        status = 'stale';
      } else {
        status = 'error';
      }
    }
    
    // Check for recent failures
    if (lastFailureLog && lastSuccessLog) {
      const failureTime = new Date(lastFailureLog.completed_at);
      const successTime = new Date(lastSuccessLog.completed_at);
      if (failureTime > successTime) {
        status = 'error';
      }
    } else if (lastFailureLog && !lastSuccessLog) {
      status = 'error';
    }
    
    // Detect data gaps (days with zero records when there should be data)
    const hasGaps = false; // Simplified - could be enhanced
    
    return {
      name: source.name,
      syncType: source.syncType,
      lastSync,
      status,
      recordsSynced,
      successRate,
      trend,
      updateFrequency: source.updateFrequency,
      hasGaps,
    };
  });

  const overallHealth = dataSourceHealth.every(ds => ds.status === 'healthy') 
    ? 'healthy' 
    : dataSourceHealth.some(ds => ds.status === 'error') 
      ? 'error' 
      : 'stale';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'stale': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      healthy: 'bg-primary/10 text-primary',
      stale: 'bg-warning/10 text-warning',
      error: 'bg-destructive/10 text-destructive',
      unknown: 'bg-muted text-muted-foreground',
    };
    return variants[status] || variants.unknown;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-primary" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-destructive" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Data Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Data Health
          </CardTitle>
          <Badge className={getStatusBadge(overallHealth)}>
            {getStatusIcon(overallHealth)}
            <span className="ml-1 capitalize">{overallHealth === 'healthy' ? 'All Systems Healthy' : overallHealth}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time status of data sources that power your analytics
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dataSourceHealth.map(source => (
            <div
              key={source.syncType}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{source.name}</span>
                </div>
                {getStatusIcon(source.status)}
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Last sync</span>
                  <span className="font-medium text-foreground">
                    {source.lastSync 
                      ? formatRelativeTime(source.lastSync)
                      : 'Never'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Success rate</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{source.successRate}%</span>
                    {getTrendIcon(source.trend)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Records (7d)</span>
                  <span className="font-medium text-foreground">
                    {formatNumber(source.recordsSynced)}
                  </span>
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-muted-foreground cursor-help">
                      <RefreshCw className="w-3 h-3" />
                      <span>{source.updateFrequency}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expected sync frequency</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {source.hasGaps && (
                <div className="mt-2 pt-2 border-t">
                  <Badge variant="outline" className="text-xs text-warning">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Data gaps detected
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-medium text-primary">
              {syncLogs?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Syncs (7d)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-medium text-primary">
              {syncLogs?.filter(l => l.status === 'success').length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-medium text-destructive">
              {syncLogs?.filter(l => l.status === 'failed').length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-medium">
              {formatNumber(dataSourceHealth.reduce((sum, ds) => sum + ds.recordsSynced, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Records Synced</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
