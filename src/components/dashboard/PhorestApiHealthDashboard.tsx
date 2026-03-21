import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Activity,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow, subDays, differenceInMinutes } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { cn } from '@/lib/utils';

interface EndpointHealth {
  name: string;
  type: string;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  successRate: number;
  avgResponseTime: number;
  totalSyncs: number;
  recordsSynced: number;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
}

const SYNC_TYPES = [
  { type: 'staff', label: 'Staff', icon: Users },
  { type: 'appointments', label: 'Appointments', icon: Calendar },
  { type: 'sales', label: 'Sales', icon: DollarSign },
  { type: 'reports', label: 'Reports', icon: BarChart3 },
  { type: 'clients', label: 'Clients', icon: FileText },
  { type: 'all', label: 'Full Sync', icon: RefreshCw },
];

export function PhorestApiHealthDashboard() {
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const [isTestingEndpoints, setIsTestingEndpoints] = useState(false);

  // Fetch sync logs for the last 7 days
  const { data: syncLogs, isLoading, refetch } = useQuery({
    queryKey: ['phorest-api-health'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { data, error } = await supabase
        .from('phorest_sync_log')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Calculate health metrics for each endpoint
  const endpointHealth: EndpointHealth[] = SYNC_TYPES.map(({ type, label }) => {
    const typeLogs = syncLogs?.filter(log => log.sync_type === type) || [];
    const successLogs = typeLogs.filter(log => log.status === 'success');
    const failureLogs = typeLogs.filter(log => log.status === 'failed');
    
    const lastSuccess = successLogs[0]?.completed_at ? new Date(successLogs[0].completed_at) : null;
    const lastFailure = failureLogs[0]?.completed_at ? new Date(failureLogs[0].completed_at) : null;
    
    const successRate = typeLogs.length > 0 
      ? Math.round((successLogs.length / typeLogs.length) * 100) 
      : 0;
    
    // Calculate avg response time from metadata if available
    const responseTimes = typeLogs
      .filter(log => {
        const meta = log.metadata as Record<string, unknown> | null;
        return meta && typeof meta.response_time_ms === 'number';
      })
      .map(log => (log.metadata as Record<string, unknown>).response_time_ms as number);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    const totalRecords = successLogs.reduce((sum, log) => sum + (log.records_synced || 0), 0);
    
    // Calculate trend (compare last 24h to previous 24h)
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
    let status: 'healthy' | 'degraded' | 'down' | 'unknown' = 'unknown';
    if (typeLogs.length === 0) {
      status = 'unknown';
    } else if (successRate >= 90) {
      status = 'healthy';
    } else if (successRate >= 50) {
      status = 'degraded';
    } else {
      status = 'down';
    }
    
    // Override status if last sync was a failure
    if (lastFailure && (!lastSuccess || lastFailure > lastSuccess)) {
      status = status === 'healthy' ? 'degraded' : status;
    }
    
    return {
      name: label,
      type,
      lastSuccess,
      lastFailure,
      successRate,
      avgResponseTime,
      totalSyncs: typeLogs.length,
      recordsSynced: totalRecords,
      trend,
      status,
    };
  });

  // Calculate overall health
  const activeEndpoints = endpointHealth.filter(e => e.totalSyncs > 0);
  const healthyEndpoints = activeEndpoints.filter(e => e.status === 'healthy').length;
  const overallHealth = activeEndpoints.length > 0 
    ? Math.round((healthyEndpoints / activeEndpoints.length) * 100) 
    : 0;

  // Get recent failures
  const recentFailures = syncLogs?.filter(log => log.status === 'failed').slice(0, 5) || [];

  const handleTestEndpoints = async () => {
    setIsTestingEndpoints(true);
    try {
      // Trigger a connection test
      await supabase.functions.invoke('test-phorest-connection');
      await refetch();
    } finally {
      setIsTestingEndpoints(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'degraded': return 'text-yellow-600 dark:text-yellow-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 dark:bg-green-900/30';
      case 'degraded': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'down': return 'bg-red-100 dark:bg-red-900/30';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'degraded': return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'down': return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Overall Health */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            overallHealth >= 80 ? 'bg-green-100 dark:bg-green-900/30' :
            overallHealth >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
            'bg-red-100 dark:bg-red-900/30'
          )}>
            <Activity className={cn(
              "w-8 h-8",
              overallHealth >= 80 ? 'text-green-600 dark:text-green-400' :
              overallHealth >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            )} />
          </div>
          <div>
            <h3 className="font-display text-xl tracking-wide">API HEALTH</h3>
            <p className="text-muted-foreground text-sm">
              {healthyEndpoints} of {activeEndpoints.length} endpoints healthy
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-display">{overallHealth}%</p>
            <p className="text-xs text-muted-foreground">Overall Health</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestEndpoints}
            disabled={isTestingEndpoints}
          >
            {isTestingEndpoints ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span className="ml-2">Test All</span>
          </Button>
        </div>
      </div>

      {/* Endpoint Status Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {endpointHealth.map((endpoint) => {
          const IconComponent = SYNC_TYPES.find(s => s.type === endpoint.type)?.icon || RefreshCw;
          
          return (
            <Card 
              key={endpoint.type} 
              className={cn("p-4 transition-colors", getStatusBg(endpoint.status))}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="w-5 h-5 text-muted-foreground" />
                  <span className="font-display text-sm tracking-wide uppercase">
                    {endpoint.name}
                  </span>
                </div>
                {getStatusIcon(endpoint.status)}
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Success Rate</span>
                    <span className={cn("font-medium", getStatusColor(endpoint.status))}>
                      {endpoint.successRate}%
                    </span>
                  </div>
                  <Progress 
                    value={endpoint.successRate} 
                    className="h-1.5"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Last Success</p>
                    <p className="font-medium truncate">
                      {endpoint.lastSuccess 
                        ? formatDistanceToNow(endpoint.lastSuccess, { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Records</p>
                    <p className="font-medium">{formatNumber(endpoint.recordsSynced)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(endpoint.trend)}
                    <span className="text-muted-foreground capitalize">{endpoint.trend}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {endpoint.totalSyncs} syncs
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Failures Table */}
      {recentFailures.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-destructive" />
            <h3 className="font-display text-lg tracking-wide">RECENT FAILURES</h3>
            <Badge variant="destructive" className="ml-auto">
              {recentFailures.length}
            </Badge>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentFailures.map((failure) => (
                <TableRow key={failure.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = SYNC_TYPES.find(s => s.type === failure.sync_type)?.icon || RefreshCw;
                        return <IconComponent className="w-4 h-4 text-muted-foreground" />;
                      })()}
                      <span className="font-medium capitalize">{failure.sync_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <Tooltip>
                      <TooltipTrigger>
                        {formatDistanceToNow(new Date(failure.started_at), { addSuffix: true })}
                      </TooltipTrigger>
                      <TooltipContent>
                        {formatDate(new Date(failure.started_at), 'PPpp')}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm text-destructive truncate">
                      {failure.error_message || 'Unknown error'}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 7-Day Summary */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-display text-lg tracking-wide">7-DAY SUMMARY</h3>
        </div>
        
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-display">{syncLogs?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Syncs</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-display text-green-600">
              {syncLogs?.filter(l => l.status === 'success').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Successful</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-display text-red-600">
              {syncLogs?.filter(l => l.status === 'failed').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-display">
              {formatNumber(syncLogs?.reduce((sum, l) => sum + (l.records_synced || 0), 0) ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">Records Synced</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
