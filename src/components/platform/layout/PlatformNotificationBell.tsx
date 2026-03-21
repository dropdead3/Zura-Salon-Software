import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Zap,
  Building2,
  Clock,
  Settings,
  CheckCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  usePlatformNotifications, 
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NOTIFICATION_TYPES,
  type PlatformNotification
} from '@/hooks/usePlatformNotifications';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  error: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  critical: { icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500/30' },
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sync_failure: AlertCircle,
  new_account: Building2,
  critical_error: AlertTriangle,
  sla_breach: Clock,
  migration_complete: CheckCircle,
  job_failure: AlertCircle,
};

export function PlatformNotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications } = usePlatformNotifications(10);
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50"
        >
          <Bell className="h-5 w-5" />
          {(unreadCount || 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 bg-slate-900 border-slate-700"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <h3 className="font-medium text-white">Notifications</h3>
          {(unreadCount || 0) > 0 && (
            <Button
              variant="ghost"
              size={tokens.button.inline}
              onClick={handleMarkAllRead}
              className="h-7 text-xs text-slate-400 hover:text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {!notifications || notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {notifications.map(notification => {
                const severityInfo = SEVERITY_CONFIG[notification.severity];
                const SeverityIcon = severityInfo.icon;
                const TypeIcon = TYPE_ICONS[notification.type] || Bell;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer",
                      !notification.is_read && "bg-slate-800/30"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", severityInfo.bg)}>
                        <SeverityIcon className={cn("h-4 w-4", severityInfo.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm line-clamp-1",
                            notification.is_read ? "text-slate-300" : "text-white font-medium"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0 text-slate-500 hover:text-white"
                              onClick={(e) => handleMarkRead(notification.id, e)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                            <TypeIcon className="h-2.5 w-2.5 mr-1" />
                            {NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES]?.label || notification.type}
                          </Badge>
                          <span className="text-[10px] text-slate-600">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-slate-700/50 p-2 grid grid-cols-2 gap-1">
          <Link
            to="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
          >
            <Settings className="h-3 w-3 mr-1" />
            Preferences
          </Link>
          <Link
            to="/dashboard/platform/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center py-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-slate-800/50 rounded transition-colors"
          >
            View All
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
