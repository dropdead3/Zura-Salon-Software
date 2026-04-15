import { useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { Bell, Check, ExternalLink, Megaphone, Hand, X, Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { AssistantBlockNotificationItem } from '@/components/dashboard/schedule/AssistantBlockNotificationItem';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  is_pinned: boolean | null;
  created_at: string;
  location_id: string | null;
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

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  entry_type: string;
  is_major: boolean | null;
  published_at: string | null;
  created_at: string;
  isRead?: boolean;
}

interface NotificationsPanelProps {
  unreadCount: number;
}

export function NotificationsPanel({
  unreadCount }: NotificationsPanelProps) {
  const { dashPath } = useOrgDashboardPath();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { assignedLocationIds, canViewAllLocations } = useUserLocationAccess();

  // Subscribe to realtime announcements and notifications changes
  useEffect(() => {
    const announcementsChannel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-announcements'] });
          queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('user-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [queryClient, user?.id]);

  // Fetch recent announcements filtered by location
  const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['notifications-announcements', user?.id, assignedLocationIds, canViewAllLocations],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      // Filter by location if user doesn't have full access
      if (!canViewAllLocations && assignedLocationIds.length > 0) {
        query = query.or(`location_id.is.null,location_id.in.(${assignedLocationIds.join(',')})`);
      }

      const { data: announcementsData, error: announcementsError } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

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

  // Fetch user notifications (high-fives, etc.)
  const { data: userNotifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as UserNotification[];
    },
    enabled: !!user?.id,
  });

  // Fetch changelog entries (What's New) - relocated from Housekeeping sidebar
  const { data: changelogEntries, isLoading: loadingChangelog } = useQuery({
    queryKey: ['changelog-entries-bell', user?.id],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from('changelog_entries')
        .select('id, title, content, entry_type, is_major, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;

      // Get read status for each entry
      const { data: reads, error: readsError } = await supabase
        .from('changelog_reads')
        .select('changelog_id')
        .eq('user_id', user?.id || '');

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map(r => r.changelog_id) || []);

      return (entries || []).map((entry: ChangelogEntry) => ({
        ...entry,
        isRead: readIds.has(entry.id),
      }));
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingAnnouncements || loadingNotifications || loadingChangelog;
  const unreadChangelogCount = changelogEntries?.filter(e => !e.isRead).length || 0;

  // Mark announcement as read (manual clear only)
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
      queryClient.invalidateQueries({ queryKey: ['notifications-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
    },
  });

  // Mark user notification as read (manual clear only)
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadAnnouncements = announcements?.filter(a => !a.isRead) || [];
      const unreadNotifications = userNotifications?.filter(n => !n.is_read) || [];
      
      // Mark announcements as read
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

      // Mark user notifications as read
      if (unreadNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user?.id || '')
          .eq('is_read', false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
    },
  });

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'important':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      default:
        return 'bg-muted border-border';
    }
  };

  // Handle notification click - navigate without marking as read
  const handleNotificationClick = (notification: UserNotification) => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Handle dismiss button click - mark as read
  const handleDismissNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markNotificationAsReadMutation.mutate(notificationId);
  };

  // Handle dismiss announcement
  const handleDismissAnnouncement = (e: React.MouseEvent, announcementId: string) => {
    e.stopPropagation();
    markAnnouncementAsReadMutation.mutate(announcementId);
  };

  // Mark changelog entry as read
  const markChangelogAsReadMutation = useMutation({
    mutationFn: async (changelogId: string) => {
      const { error } = await supabase
        .from('changelog_reads')
        .upsert({
          changelog_id: changelogId,
          user_id: user?.id || '',
        }, {
          onConflict: 'changelog_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-entries-bell'] });
    },
  });

  // Handle click on changelog entry - navigate to changelog page
  const handleChangelogClick = (entry: ChangelogEntry) => {
    navigate(dashPath('/changelog'));
  };

  // Handle dismiss changelog
  const handleDismissChangelog = (e: React.MouseEvent, changelogId: string) => {
    e.stopPropagation();
    markChangelogAsReadMutation.mutate(changelogId);
  };

  // Get entry type badge color
  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
      case 'improvement':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'fix':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          {(unreadCount > 0 || unreadChangelogCount > 0) && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center text-[10px] font-medium bg-destructive/20 text-destructive border border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)] px-1 rounded-full">
              {(unreadCount + unreadChangelogCount) > 9 ? '9+' : (unreadCount + unreadChangelogCount)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <Tabs defaultValue="notifications" className="w-full">
          <div className="flex items-center justify-between px-3 pt-3 pb-0 border-b border-border">
            <TabsList className="h-8 p-0 bg-transparent">
              <TabsTrigger value="notifications" className="h-8 px-3 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 h-4 min-w-4 flex items-center justify-center text-[10px] font-medium bg-destructive/20 text-destructive border border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)] px-1 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="whats-new" className="h-8 px-3 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Sparkles className="w-3 h-3 mr-1" />
                What's New
                {unreadChangelogCount > 0 && (
                  <span className="ml-1.5 h-4 min-w-4 flex items-center justify-center text-[10px] font-medium bg-primary text-primary-foreground px-1 rounded-full">
                    {unreadChangelogCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size={tokens.button.inline}
                className="h-7 text-xs"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (announcements && announcements.length > 0) || (userNotifications && userNotifications.length > 0) ? (
                <div className="divide-y divide-border">
                  {/* User Notifications (high-fives, etc.) */}
                  {userNotifications?.map((notification) => {
                    // Route assistant_time_block notifications to custom renderer
                    if (notification.type === 'assistant_time_block') {
                      return (
                        <AssistantBlockNotificationItem
                          key={notification.id}
                          notification={notification}
                          currentUserId={user?.id || ''}
                          onDismiss={handleDismissNotification}
                        />
                      );
                    }

                    return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 transition-colors hover:bg-muted/50 cursor-pointer group",
                        !notification.is_read && "bg-primary/5"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-full border shrink-0 mt-0.5 bg-accent/50 border-accent text-accent-foreground">
                          <Hand className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm",
                            !notification.is_read && "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDismissNotification(e, notification.id)}
                            title="Mark as read"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}

                  {/* Announcements */}
                  {announcements?.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={cn(
                        "p-3 transition-colors hover:bg-muted/50 group",
                        !announcement.isRead && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "p-1.5 rounded-full border shrink-0 mt-0.5",
                          getPriorityColor(announcement.priority)
                        )}>
                          <Megaphone className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm truncate",
                              !announcement.isRead && "font-medium"
                            )}>
                              {announcement.title}
                            </p>
                            {announcement.is_pinned && (
                              <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded shrink-0">
                                Pinned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {announcement.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!announcement.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDismissAnnouncement(e, announcement.id)}
                            title="Mark as read"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground/70">You're all caught up!</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* What's New Tab */}
          <TabsContent value="whats-new" className="mt-0">
            <ScrollArea className="h-[300px]">
              {loadingChangelog ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : changelogEntries && changelogEntries.length > 0 ? (
                <div className="divide-y divide-border">
                  {changelogEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "p-3 transition-colors hover:bg-muted/50 cursor-pointer group",
                        !entry.isRead && "bg-primary/5"
                      )}
                      onClick={() => handleChangelogClick(entry)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "p-1.5 rounded-full border shrink-0 mt-0.5",
                          getEntryTypeColor(entry.entry_type)
                        )}>
                          <Sparkles className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm truncate",
                              !entry.isRead && "font-medium"
                            )}>
                              {entry.title}
                            </p>
                            {entry.is_major && (
                              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded shrink-0">
                                Major
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {entry.content.replace(/[#*`]/g, '').substring(0, 100)}...
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(entry.published_at || entry.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!entry.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDismissChangelog(e, entry.id)}
                            title="Mark as read"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No updates yet</p>
                  <p className="text-xs text-muted-foreground/70">Check back later for new features!</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-2 border-t border-border grid grid-cols-2 gap-1">
          <Link to={dashPath('/notifications')}>
            <Button variant="ghost" size={tokens.button.inline} className="w-full justify-start text-xs h-8">
              <Settings className="w-3 h-3 mr-1" />
              Preferences
            </Button>
          </Link>
          <Link to={dashPath('/changelog')}>
            <Button variant="ghost" size={tokens.button.inline} className="w-full justify-end text-xs h-8">
              View updates
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
