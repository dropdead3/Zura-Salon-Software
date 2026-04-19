import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface SyncStatus {
  sync_type: string;
  status: string;
  completed_at: string | null;
}

export function PhorestSyncPopout({
  asMenuItem = false }: { asMenuItem?: boolean }) {
  const { dashPath } = useOrgDashboardPath();
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { syncLabel } = usePOSProviderLabel();

  // Fetch latest sync status for each type
  const { data: syncStatuses } = useQuery({
    queryKey: ['phorest-sync-popout-status'],
    queryFn: async () => {
      const types = ['appointments', 'sales', 'staff', 'all'];
      const statuses: Record<string, SyncStatus | null> = {};
      
      for (const type of types) {
        const { data } = await supabase
          .from('phorest_sync_log')
          .select('sync_type, status, completed_at')
          .eq('sync_type', type)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        statuses[type] = data;
      }
      
      return statuses;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Trigger full sync - fire and forget since it can take a long time
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      // Fire individual syncs in parallel with short timeout awareness
      // Each sync type runs independently to avoid CPU timeout
      const syncTypes = ['appointments', 'sales', 'staff', 'clients'];
      const results: Record<string, any> = {};
      
      for (const syncType of syncTypes) {
        try {
          const { data, error } = await supabase.functions.invoke('sync-phorest-data', {
            body: { sync_type: syncType },
          });
          if (error) {
            results[syncType] = { error: error.message };
          } else {
            results[syncType] = data;
          }
        } catch (err: any) {
          // If one sync type fails/times out, continue with others
          results[syncType] = { error: err.message };
        }
      }

      const failedSyncs = Object.entries(results)
        .filter(([_, result]: [string, any]) => result?.error)
        .map(([type]) => type);

      if (failedSyncs.length === syncTypes.length) {
        toast.error('All syncs failed. The sync will retry automatically.');
      } else if (failedSyncs.length > 0) {
        toast.warning(`Sync completed with errors in: ${failedSyncs.join(', ')}`);
      } else {
        toast.success('Full sync completed successfully');
      }

      // Refresh sync status and sales analytics data
      queryClient.invalidateQueries({ queryKey: ['phorest-sync-popout-status'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sales-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sales-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['quick-stats'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-summary'] });
      queryClient.invalidateQueries({ queryKey: ['goal-period-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['rebooking-rate'] });
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate overall health
  const getOverallHealth = () => {
    if (!syncStatuses) return 'unknown';
    
    const appointmentSync = syncStatuses.appointments;
    const salesSync = syncStatuses.sales;
    
    // Check if appointments synced in last 10 minutes
    if (appointmentSync?.completed_at) {
      const lastSync = new Date(appointmentSync.completed_at);
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (lastSync < tenMinsAgo) return 'stale';
    }
    
    // Check for any failures (no_data is not a failure)
    if (appointmentSync?.status === 'failed' || salesSync?.status === 'failed') {
      return 'error';
    }
    
    if (appointmentSync?.status === 'success' || appointmentSync?.status === 'no_data') return 'healthy';
    return 'unknown';
  };

  const health = getOverallHealth();
  
  const getHealthColor = () => {
    switch (health) {
      case 'healthy':
        return 'bg-primary';
      case 'error':
        return 'bg-destructive';
      case 'stale':
        return 'bg-warning';
      default:
        return 'bg-muted-foreground';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    if (status === 'success' || status === 'no_data') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />;
    }
    if (status === 'failed') {
      return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    }
    return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const getTimeAgo = (completedAt: string | null) => {
    if (!completedAt) return 'Never';
    return formatDistanceToNow(new Date(completedAt), { addSuffix: true });
  };

  const appointmentSync = syncStatuses?.appointments;
  const salesSync = syncStatuses?.sales;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {asMenuItem ? (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-auto px-2 py-1.5 rounded-sm font-normal text-sm"
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                Sync Status
                <span 
                  className={cn(
                    "ml-auto h-2 w-2 rounded-full",
                    getHealthColor()
                  )} 
                />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                <span 
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    getHealthColor(),
                    health === 'healthy' && "shadow-[0_0_4px_hsl(var(--primary))]",
                    health === 'error' && "shadow-[0_0_4px_hsl(var(--destructive))]",
                    health === 'stale' && "shadow-[0_0_4px_hsl(var(--warning))]",
                  )} 
                />
              </Button>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{syncLabel} Status</p>
        </TooltipContent>
      </Tooltip>
      
      <PopoverContent align="end" className="w-80 p-0 bg-card/60 backdrop-blur-xl backdrop-saturate-150 border border-border rounded-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/15">
          <h4 className="font-display text-xs uppercase tracking-wider text-foreground">
            {syncLabel}
          </h4>
          <Link 
            to={dashPath('/admin/phorest-settings')} 
            className="flex items-center gap-1 font-display text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
          >
            Settings
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        
        {/* Sync Status List */}
        <div className="px-5 py-4 space-y-2">
          {/* Appointments */}
          <div className="flex items-center justify-between bg-card-inner/30 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[11px]",
                appointmentSync?.status === 'failed' ? "text-destructive" : "text-muted-foreground"
              )}>
                {getTimeAgo(appointmentSync?.completed_at || null)}
              </span>
              {getStatusIcon(appointmentSync?.status)}
            </div>
          </div>
          
          {/* Sales */}
          <div className="flex items-center justify-between bg-card-inner/30 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[11px]",
                salesSync?.status === 'failed' ? "text-destructive" : "text-muted-foreground"
              )}>
                {getTimeAgo(salesSync?.completed_at || null)}
              </span>
              {getStatusIcon(salesSync?.status)}
            </div>
          </div>
        </div>
        
        {/* Sync Now Button */}
        <div className="px-5 pb-5 pt-2">
          <Button 
            onClick={handleSyncNow} 
            disabled={isSyncing}
            className="w-full rounded-full bg-foreground text-background hover:bg-foreground/80"
            size={tokens.button.card}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
        
        {/* Footer hint */}
        <div className="px-5 py-2 border-t border-border/10">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            Auto-syncs every 5 minutes
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
