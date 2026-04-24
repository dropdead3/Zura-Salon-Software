import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Settings,
  Check,
  Building2,
  Clock,
  Zap,
  CreditCard
} from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  usePlatformNotifications, 
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useUpdateNotificationPreference,
  NOTIFICATION_TYPES,
  type PlatformNotification
} from '@/hooks/usePlatformNotifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageExplainer } from '@/components/ui/PageExplainer';

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
  payment_failed: CreditCard,
  payment_recovered: CheckCircle,
};

export default function NotificationsPage() {
  const { data: notifications, isLoading } = usePlatformNotifications(100);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Notifications"
        description="Platform alerts and activity"
        actions={
          unreadCount > 0 && (
            <PlatformButton 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
        <PageExplainer pageId="platform-notifications" />
              Mark All Read
            </PlatformButton>
          )
        }
      />

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="all" className="data-[state=active]:bg-violet-600">
            All
            {notifications && notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-slate-600">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-violet-600">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-violet-600">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-violet-600">
            <Settings className="h-4 w-4 mr-1" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NotificationList 
            notifications={notifications || []} 
            isLoading={isLoading}
            onMarkRead={(id) => markRead.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationList 
            notifications={(notifications || []).filter(n => !n.is_read)} 
            isLoading={isLoading}
            onMarkRead={(id) => markRead.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </PlatformPageContainer>
  );
}

function NotificationList({ 
  notifications, 
  isLoading,
  onMarkRead 
}: { 
  notifications: PlatformNotification[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 bg-slate-700/50 rounded-xl" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-12 text-center">
        <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white">No notifications</h3>
        <p className="text-slate-400 mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map(notification => {
        const severityInfo = SEVERITY_CONFIG[notification.severity];
        const SeverityIcon = severityInfo.icon;
        const TypeIcon = TYPE_ICONS[notification.type] || Bell;

        return (
          <div
            key={notification.id}
            className={cn(
              "rounded-xl border bg-slate-800/40 p-4 transition-all",
              notification.is_read 
                ? "border-slate-700/30 opacity-70" 
                : "border-slate-700/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn("p-2 rounded-lg", severityInfo.bg)}>
                <SeverityIcon className={cn("h-5 w-5", severityInfo.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-white">{notification.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                    {!notification.is_read && (
                      <PlatformButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </PlatformButton>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES]?.label || notification.type}
                  </Badge>
                  <Badge className={cn(severityInfo.bg, severityInfo.color, "text-xs")}>
                    {notification.severity}
                  </Badge>
                </div>

                {notification.link && (
                  <a 
                    href={notification.link}
                    className="inline-block mt-2 text-sm text-violet-400 hover:text-violet-300"
                  >
                    View details →
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePref = useUpdateNotificationPreference();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 bg-slate-700/50 rounded-xl" />
        ))}
      </div>
    );
  }

  const handleToggle = async (
    type: string, 
    channel: 'in_app_enabled' | 'email_enabled' | 'slack_enabled',
    value: boolean
  ) => {
    const currentPref = preferences?.[type];
    try {
      await updatePref.mutateAsync({
        notificationType: type,
        inAppEnabled: channel === 'in_app_enabled' ? value : currentPref?.in_app_enabled ?? true,
        emailEnabled: channel === 'email_enabled' ? value : currentPref?.email_enabled ?? true,
        slackEnabled: channel === 'slack_enabled' ? value : currentPref?.slack_enabled ?? false,
      });
      toast.success('Preference updated');
    } catch (error) {
      toast.error('Failed to update preference');
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
      <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/60">
        <div className="text-sm font-medium text-slate-400">Notification Type</div>
        <div className="text-sm font-medium text-slate-400 text-center">In-App</div>
        <div className="text-sm font-medium text-slate-400 text-center">Email</div>
        <div className="text-sm font-medium text-slate-400 text-center">Slack</div>
      </div>

      {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => {
        const pref = preferences?.[type];
        
        return (
          <div 
            key={type} 
            className="grid grid-cols-4 gap-4 px-4 py-4 border-b border-slate-700/30 last:border-0 items-center"
          >
            <div>
              <h4 className="font-medium text-white">{config.label}</h4>
              <p className="text-xs text-slate-500">{config.description}</p>
            </div>
            <div className="flex justify-center">
              <Switch
                checked={pref?.in_app_enabled ?? true}
                onCheckedChange={(v) => handleToggle(type, 'in_app_enabled', v)}
              />
            </div>
            <div className="flex justify-center">
              <Switch
                checked={pref?.email_enabled ?? config.defaultChannels.includes('email')}
                onCheckedChange={(v) => handleToggle(type, 'email_enabled', v)}
              />
            </div>
            <div className="flex justify-center">
              <Switch
                checked={pref?.slack_enabled ?? false}
                onCheckedChange={(v) => handleToggle(type, 'slack_enabled', v)}
                disabled // Slack integration coming soon
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
