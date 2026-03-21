import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTriggerPhorestSync } from '@/hooks/usePhorestSync';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface PhorestSyncButtonProps {
  syncType?: 'appointments' | 'sales' | 'staff' | 'clients' | 'reports' | 'services' | 'all';
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function PhorestSyncButton({ 
  syncType = 'sales', 
  variant = 'outline',
  size = 'sm',
  className,
  showLabel = true 
}: PhorestSyncButtonProps) {
  const { mutate: syncData, isPending } = useTriggerPhorestSync();

  const handleSync = () => {
    syncData(syncType);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSync}
      disabled={isPending}
      className={cn('gap-2', className)}
    >
      <RefreshCw className={cn('w-4 h-4', isPending && 'animate-spin')} />
      {showLabel && (isPending ? 'Syncing...' : 'Sync')}
    </Button>
  );
}
