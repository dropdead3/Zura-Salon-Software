import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface SyncStatus {
  sync_type: string;
  status: string;
  completed_at: string | null;
}

export function SidebarSyncStatusWidget({
  isCollapsed = false,
  onNavClick,
}: { 
  isCollapsed?: boolean;
  onNavClick?: () => void;
}) {
  const { dashPath } = useOrgDashboardPath();
  const { syncLabel, isConnected } = usePOSProviderLabel();

  // Fetch latest sync status for each type
  const { data: syncStatuses } = useQuery({
    queryKey: ['sidebar-sync-status'],
    queryFn: async () => {
      // Get the most recent sync for each type
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
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

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
  
  const getHealthIcon = () => {
    switch (health) {
      case 'healthy':
        return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case 'stale':
        return <AlertCircle className="w-3.5 h-3.5 text-warning" />;
      default:
        return <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (completedAt: string | null) => {
    if (!completedAt) return 'Never';
    return formatDistanceToNow(new Date(completedAt), { addSuffix: false });
  };

  if (!syncStatuses) return null;

  const appointmentSync = syncStatuses.appointments;
  const salesSync = syncStatuses.sales;

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={dashPath('/admin/phorest-settings')}
            onClick={onNavClick}
            className="flex items-center justify-center py-2 px-2 mx-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
          >
            {getHealthIcon()}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="space-y-1">
          <p className="font-medium">{syncLabel}</p>
          <p className="text-xs text-muted-foreground">
            Appointments: {getTimeAgo(appointmentSync?.completed_at || null)} ago
          </p>
          <p className="text-xs text-muted-foreground">
            Sales: {getTimeAgo(salesSync?.completed_at || null)} ago
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to={dashPath('/admin/phorest-settings')}
      onClick={onNavClick}
      className="mx-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors block"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-display uppercase tracking-wider text-foreground">
          {syncLabel}
        </span>
        {getHealthIcon()}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className={cn(
            "text-muted-foreground",
            appointmentSync?.status === 'failed' && "text-destructive"
          )}>
            {getTimeAgo(appointmentSync?.completed_at || null)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-muted-foreground" />
          <span className={cn(
            "text-muted-foreground",
            salesSync?.status === 'failed' && "text-destructive"
          )}>
            {getTimeAgo(salesSync?.completed_at || null)}
          </span>
        </div>
      </div>
    </Link>
  );
}
