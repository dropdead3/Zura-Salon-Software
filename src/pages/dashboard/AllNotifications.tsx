import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bell, Check, Megaphone, Hand, AlertTriangle, Clock, 
  Calendar, FileText, ArrowRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { formatRelativeTime } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  is_pinned: boolean | null;
  created_at: string;
  link_url?: string | null;
  link_label?: string | null;
  isRead?: boolean;
}

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

type FilterType = 'all' | 'unread' | 'announcements' | 'system';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'high_five':
      return <Hand className="w-4 h-4" />;
    case 'sync_failure':
      return <AlertTriangle className="w-4 h-4" />;
    case 'assignment_accepted':
    case 'assignment_declined':
      return <Check className="w-4 h-4" />;
    case 'assistant_timeout':
      return <Clock className="w-4 h-4" />;
    case 'birthday_reminder':
      return <Calendar className="w-4 h-4" />;
    case 'meeting_reminder':
      return <Calendar className="w-4 h-4" />;
    case 'task_reminder':
    case 'handbook_reminder':
      return <FileText className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getActionLabel = (type: string): string => {
  const labels: Record<string, string> = {
    sync_failure: 'View Settings',
    high_five: 'View Bell Ring',
    assignment_accepted: 'View Schedule',
    assignment_declined: 'View Schedule',
    assistant_timeout: 'View Schedule',
    birthday_reminder: 'View Birthdays',
    meeting_reminder: 'View Meeting',
    task_reminder: 'View Tasks',
    handbook_reminder: 'View Handbooks',
  };
  return labels[type] || 'Take Action';
};

const getIconStyle = (type: string, priority?: string | null) => {
  if (type === 'sync_failure') {
    return 'bg-destructive/10 border-destructive/30 text-destructive';
  }
  if (type === 'high_five') {
    return 'bg-accent/50 border-accent text-accent-foreground';
  }
  if (priority === 'urgent') {
    return 'bg-destructive/10 border-destructive/30 text-destructive';
  }
  if (priority === 'important') {
    return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
  }
  return 'bg-muted border-border';
};

export default function AllNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch all announcements
  const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['all-announcements', user?.id],
    queryFn: async () => {
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      // Get read status for each announcement
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user?.id || '');

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);

      return (announcementsData || []).map((a: Announcement) => ({
        ...a,
        isRead: readIds.has(a.id),
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch all user notifications
  const { data: userNotifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['all-user-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as UserNotification[];
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingAnnouncements || loadingNotifications;

  // Mark notification as read
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
    },
  });

  // Mark announcement as read
  const markAnnouncementAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user?.id || '',
        }, {
          onConflict: 'announcement_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadAnnouncements = announcements?.filter(a => !a.isRead) || [];
      const unreadNotifications = userNotifications?.filter(n => !n.is_read) || [];
      
      if (unreadAnnouncements.length > 0) {
        await supabase
          .from('announcement_reads')
          .upsert(
            unreadAnnouncements.map(a => ({
              announcement_id: a.id,
              user_id: user?.id || '',
            })),
            { onConflict: 'announcement_id,user_id' }
          );
      }

      if (unreadNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user?.id || '')
          .eq('is_read', false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
    },
  });

  // Filter logic
  const unreadAnnouncementsCount = announcements?.filter(a => !a.isRead).length || 0;
  const unreadNotificationsCount = userNotifications?.filter(n => !n.is_read).length || 0;
  const totalUnread = unreadAnnouncementsCount + unreadNotificationsCount;

  const systemNotificationTypes = ['sync_failure', 'assistant_timeout', 'assignment_accepted', 'assignment_declined'];

  const getFilteredItems = () => {
    const allItems: Array<{ type: 'notification' | 'announcement'; data: UserNotification | Announcement }> = [];
    
    userNotifications?.forEach(n => allItems.push({ type: 'notification', data: n }));
    announcements?.forEach(a => allItems.push({ type: 'announcement', data: a }));
    
    // Sort by date
    allItems.sort((a, b) => {
      const dateA = new Date(a.data.created_at).getTime();
      const dateB = new Date(b.data.created_at).getTime();
      return dateB - dateA;
    });

    switch (filter) {
      case 'unread':
        return allItems.filter(item => {
          if (item.type === 'notification') return !(item.data as UserNotification).is_read;
          return !(item.data as Announcement).isRead;
        });
      case 'announcements':
        return allItems.filter(item => item.type === 'announcement');
      case 'system':
        return allItems.filter(item => 
          item.type === 'notification' && 
          systemNotificationTypes.includes((item.data as UserNotification).type)
        );
      default:
        return allItems;
    }
  };

  const filteredItems = getFilteredItems();

  const renderNotification = (notification: UserNotification) => (
    <div
      key={notification.id}
      className={cn(
        "p-4 rounded-lg border transition-colors",
        !notification.is_read ? "bg-primary/5 border-primary/20" : "bg-card border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full border shrink-0",
          getIconStyle(notification.type)
        )}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={cn(
                "text-sm",
                !notification.is_read && "font-medium"
              )}>
                {notification.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatRelativeTime(notification.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!notification.is_read && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {notification.link && (
              <Link to={notification.link}>
                <Button variant="outline" size={tokens.button.card}>
                  {getActionLabel(notification.type)}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markNotificationAsReadMutation.mutate(notification.id)}
                disabled={markNotificationAsReadMutation.isPending}
              >
                <Check className="w-3 h-3 mr-1" />
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnnouncement = (announcement: Announcement) => (
    <div
      key={announcement.id}
      className={cn(
        "p-4 rounded-lg border transition-colors",
        !announcement.isRead ? "bg-primary/5 border-primary/20" : "bg-card border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full border shrink-0",
          getIconStyle('announcement', announcement.priority)
        )}>
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm",
                  !announcement.isRead && "font-medium"
                )}>
                  {announcement.title}
                </p>
                {announcement.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    Pinned
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {announcement.content}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatRelativeTime(announcement.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!announcement.isRead && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {announcement.link_url && (
              <a href={announcement.link_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size={tokens.button.card}>
                  {announcement.link_label || 'View Link'}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </a>
            )}
            {!announcement.isRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAnnouncementAsReadMutation.mutate(announcement.id)}
                disabled={markAnnouncementAsReadMutation.isPending}
              >
                <Check className="w-3 h-3 mr-1" />
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="space-y-0 pb-4">
            <DashboardPageHeader
              title="Notifications"
              description="View all announcements and system notifications in one place."
              actions={
                totalUnread > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
        <PageExplainer pageId="all-notifications" />
                    Mark All Read
                  </Button>
                )
              }
            />
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2 w-fit mt-2">
                {totalUnread} unread
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
              <ResponsiveTabsList onTabChange={(v) => setFilter(v as FilterType)}>
                <TabsTrigger value="all" className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex items-center gap-1">
                  Unread
                  {totalUnread > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {totalUnread}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </ResponsiveTabsList>

              <TabsContent value={filter} className="mt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="space-y-3">
                    {filteredItems.map((item) => 
                      item.type === 'notification' 
                        ? renderNotification(item.data as UserNotification)
                        : renderAnnouncement(item.data as Announcement)
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bell}
                    title="No notifications"
                    description="You’re all caught up."
                    className="border-none bg-transparent"
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
