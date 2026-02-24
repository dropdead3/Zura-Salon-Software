import { useQuery } from '@tanstack/react-query';
import { tokens } from '@/lib/design-tokens';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTriggerPhorestSync } from '@/hooks/usePhorestSync';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SyncType = 'all' | 'appointments' | 'clients' | 'reports' | 'sales' | 'staff';

interface LastSyncIndicatorProps {
  syncType?: SyncType;
  showAutoRefresh?: boolean;
  onRefresh?: () => void;
}

export function LastSyncIndicator({ 
  syncType = 'sales',
  showAutoRefresh = false,
}: LastSyncIndicatorProps) {
  const { mutate: triggerSync, isPending } = useTriggerPhorestSync();
  
  const { data: lastSync, refetch } = useQuery({
    queryKey: ['last-sync', syncType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_sync_log')
        .select('completed_at, status, records_synced')
        .eq('sync_type', syncType)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: showAutoRefresh ? 30000 : false, // Auto-refresh every 30s if enabled
  });

  const handleRefresh = () => {
    triggerSync(syncType, {
      onSuccess: () => {
        // Refetch sync status after triggering
        setTimeout(() => refetch(), 2000);
      }
    });
  };

  if (!lastSync) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="w-3 h-3" />
        <span>Never synced</span>
        <Button 
          variant="ghost" 
          size={tokens.button.inline} 
          className="h-6 px-2 text-xs"
          onClick={handleRefresh}
          disabled={isPending}
        >
          <RefreshCw className={cn('w-3 h-3 mr-1', isPending && 'animate-spin')} />
          Sync now
        </Button>
      </div>
    );
  }

  const isNoData = lastSync.status === 'no_data';
  const isSuccess = lastSync.status === 'completed' || lastSync.status === 'success' || isNoData;
  const timeAgo = lastSync.completed_at 
    ? formatDistanceToNow(new Date(lastSync.completed_at), { addSuffix: true })
    : 'Unknown';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs">
            {isSuccess ? (
              <CheckCircle2 className="w-3 h-3 text-chart-2" />
            ) : (
              <AlertCircle className="w-3 h-3 text-chart-4" />
            )}
            <span className="text-muted-foreground">
              {isNoData ? 'No sales yet' : `Synced ${timeAgo}`}
            </span>
            <Button 
              variant="ghost" 
              size={tokens.button.inline} 
              className="h-6 w-6 p-0"
              onClick={handleRefresh}
              disabled={isPending}
            >
              <RefreshCw className={cn('w-3 h-3', isPending && 'animate-spin')} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{lastSync.records_synced || 0} records synced</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
