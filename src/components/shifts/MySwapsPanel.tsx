import { motion } from 'framer-motion';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, ArrowLeftRight, ArrowDown, Gift,
  XCircle, CheckCircle, Hourglass, Timer, AlertCircle 
} from 'lucide-react';
import { useMySwaps, useCancelSwap } from '@/hooks/useShiftSwaps';
import type { ShiftSwap } from '@/hooks/useShiftSwaps';

const swapTypeConfig = {
  swap: { icon: ArrowLeftRight, label: 'Swap' },
  cover: { icon: ArrowDown, label: 'Cover' },
  giveaway: { icon: Gift, label: 'Giveaway' },
};

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  open: { icon: Timer, color: 'bg-emerald-500/10 text-emerald-600' },
  claimed: { icon: Hourglass, color: 'bg-amber-500/10 text-amber-600' },
  pending_approval: { icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600' },
  approved: { icon: CheckCircle, color: 'bg-green-500/10 text-green-600' },
  denied: { icon: XCircle, color: 'bg-red-500/10 text-red-600' },
  cancelled: { icon: XCircle, color: 'bg-muted text-muted-foreground' },
  expired: { icon: Timer, color: 'bg-muted text-muted-foreground' },
};

interface SwapListItemProps {
  swap: ShiftSwap;
  type: 'requested' | 'claimed';
  onCancel?: () => void;
}

function SwapListItem({ swap, type, onCancel }: SwapListItemProps) {
  const { formatDate } = useFormatDate();
  const typeConfig = swapTypeConfig[swap.swap_type];
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[swap.status];
  const StatusIcon = status.icon;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return formatDate(date, 'h:mm a');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <TypeIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">
                {formatDate(new Date(swap.original_date), 'EEE, MMM d')}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatTime(swap.original_start_time)} - {formatTime(swap.original_end_time)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className={status.color} variant="secondary">
              <StatusIcon className="w-3 h-3 mr-1" />
              {swap.status.replace('_', ' ')}
            </Badge>
            {type === 'requested' && swap.status === 'open' && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onCancel}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

interface MySwapsPanelProps {
  className?: string;
}

export function MySwapsPanel({ className }: MySwapsPanelProps) {
  const { data, isLoading } = useMySwaps();
  const cancelSwap = useCancelSwap();

  const { requested = [], claimed = [] } = data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="requested">
        <TabsList>
          <TabsTrigger value="requested" className="flex-1">
            My Requests
            {requested.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {requested.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="claimed" className="flex-1">
            My Claims
            {claimed.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {claimed.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requested" className="mt-4">
          <ScrollArea className="h-[300px]">
            {requested.length > 0 ? (
              <div className="space-y-2 pr-4">
                {requested.map((swap) => (
                  <SwapListItem
                    key={swap.id}
                    swap={swap}
                    type="requested"
                    onCancel={() => cancelSwap.mutate(swap.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <ArrowLeftRight className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No swap requests yet</p>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="claimed" className="mt-4">
          <ScrollArea className="h-[300px]">
            {claimed.length > 0 ? (
              <div className="space-y-2 pr-4">
                {claimed.map((swap) => (
                  <SwapListItem key={swap.id} swap={swap} type="claimed" />
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No claimed shifts yet</p>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
