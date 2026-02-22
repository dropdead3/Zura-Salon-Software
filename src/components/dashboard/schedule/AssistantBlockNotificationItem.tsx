import { Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AssistantBlockActions } from './AssistantBlockActions';
import { cn } from '@/lib/utils';

interface AssistantBlockNotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string | null;
    metadata?: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
  };
  currentUserId: string;
  onDismiss: (e: React.MouseEvent, id: string) => void;
}

export function AssistantBlockNotificationItem({
  notification,
  currentUserId,
  onDismiss,
}: AssistantBlockNotificationItemProps) {
  const metadata = notification.metadata as Record<string, string> | null;
  const timeBlockId = metadata?.time_block_id;
  const requestingUserId = metadata?.requesting_user_id;

  // Only show action buttons if this is targeted at the current user as assistant
  const showActions = !!timeBlockId && !!requestingUserId && requestingUserId !== currentUserId;

  return (
    <div
      className={cn(
        'p-3 transition-colors hover:bg-muted/50 group',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-full border shrink-0 mt-0.5 bg-blue-500/10 border-blue-500/30 text-blue-600">
          <Users className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={cn('text-sm', !notification.is_read && 'font-medium')}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          {showActions && (
            <AssistantBlockActions
              blockId={timeBlockId}
              requestingUserId={requestingUserId}
              isAssistant
              compact
            />
          )}
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}
