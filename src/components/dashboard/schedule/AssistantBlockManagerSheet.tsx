import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Clock, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAssistantTimeBlocksRange, type AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';
import { AssistantBlockActions } from './AssistantBlockActions';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDisplayName } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface AssistantBlockManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  currentDate: Date;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes?.slice(0, 2)} ${ampm}`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    requested: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    declined: 'bg-destructive/10 text-destructive',
  };
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status}
    </Badge>
  );
}

function BlockRow({
  block,
  showActions,
  showDelete,
  currentUserId,
}: {
  block: AssistantTimeBlock;
  showActions: boolean;
  showDelete: boolean;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    const { error } = await supabase
      .from('assistant_time_blocks')
      .delete()
      .eq('id', block.id);

    if (error) {
      toast.error('Failed to remove block');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks'] });
    queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks-range'] });
    queryClient.invalidateQueries({ queryKey: ['assistant-pending-blocks'] });
    toast.success('Block removed');
  };

  const requesterName = block.requesting_profile
    ? formatDisplayName(block.requesting_profile.full_name, block.requesting_profile.display_name)
    : 'Unknown';
  const assistantName = block.assistant_profile
    ? formatDisplayName(block.assistant_profile.full_name, block.assistant_profile.display_name)
    : null;

  const isRequester = block.requesting_user_id === currentUserId;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium">
            {formatTime12h(block.start_time)} – {formatTime12h(block.end_time)}
          </span>
          <StatusBadge status={block.status} />
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {isRequester
            ? assistantName
              ? `Assistant: ${assistantName}`
              : 'Unassigned — awaiting assistant'
            : `Requested by ${requesterName}`}
        </div>
        {block.notes && (
          <div className="text-xs text-muted-foreground italic truncate">{block.notes}</div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {showActions && block.status === 'requested' && (
          <AssistantBlockActions
            blockId={block.id}
            requestingUserId={block.requesting_user_id}
            compact
          />
        )}
        {showDelete && (
          <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function BlocksByDate({
  blocks,
  showActions,
  showDelete,
  currentUserId,
  emptyMessage,
}: {
  blocks: AssistantTimeBlock[];
  showActions: boolean;
  showDelete: boolean;
  currentUserId: string;
  emptyMessage: string;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, AssistantTimeBlock[]>();
    blocks.forEach(b => {
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    });
    // Sort dates
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [blocks]);

  if (blocks.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Users className={tokens.empty.icon} />
        <p className={tokens.empty.description}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateStr, dateBlocks]) => (
        <div key={dateStr} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {format(new Date(dateStr + 'T12:00:00'), 'EEEE, MMM d')}
          </h4>
          {dateBlocks
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map(block => (
              <BlockRow
                key={block.id}
                block={block}
                showActions={showActions}
                showDelete={showDelete}
                currentUserId={currentUserId}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

export function AssistantBlockManagerSheet({
  open,
  onOpenChange,
  locationId,
  currentDate,
}: AssistantBlockManagerSheetProps) {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
  const currentUserId = user?.id || '';

  // Fetch blocks for a 30-day window
  const startDate = format(currentDate, 'yyyy-MM-dd');
  const endDate = useMemo(() => {
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 30);
    return format(end, 'yyyy-MM-dd');
  }, [currentDate]);

  const { timeBlocks, isLoading } = useAssistantTimeBlocksRange(
    open ? startDate : null,
    open ? endDate : null,
    open ? locationId : null,
  );

  const myRequests = useMemo(
    () => timeBlocks.filter(b => b.requesting_user_id === currentUserId),
    [timeBlocks, currentUserId]
  );

  const myAssists = useMemo(
    () => timeBlocks.filter(b => b.assistant_user_id === currentUserId),
    [timeBlocks, currentUserId]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 font-display text-base tracking-wide">
            <Users className="h-5 w-5 text-primary" />
            ASSISTANT BLOCKS
          </SheetTitle>
          <SheetDescription className="text-xs">
            Manage your assistant coverage requests and assignments.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="requests" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="requests" className="flex-1">
                My Requests
                {myRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1 text-xs">
                    {myRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="assists" className="flex-1">
                My Assists
                {myAssists.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1 text-xs">
                    {myAssists.length}
                  </Badge>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="all" className="flex-1">
                  All
                  {timeBlocks.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1 text-xs">
                      {timeBlocks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : (
              <>
                <TabsContent value="requests" className="mt-0">
                  <BlocksByDate
                    blocks={myRequests}
                    showActions={false}
                    showDelete
                    currentUserId={currentUserId}
                    emptyMessage="No coverage requests yet"
                  />
                </TabsContent>

                <TabsContent value="assists" className="mt-0">
                  <BlocksByDate
                    blocks={myAssists}
                    showActions
                    showDelete={false}
                    currentUserId={currentUserId}
                    emptyMessage="No assist assignments"
                  />
                </TabsContent>

                {isAdmin && (
                  <TabsContent value="all" className="mt-0">
                    <BlocksByDate
                      blocks={timeBlocks}
                      showActions
                      showDelete
                      currentUserId={currentUserId}
                      emptyMessage="No assistant blocks found"
                    />
                  </TabsContent>
                )}
              </>
            )}
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
