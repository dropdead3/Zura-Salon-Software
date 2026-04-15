import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Megaphone, X, Pin, ExternalLink, Settings, Plus, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { useUnreadAnnouncementCount } from '@/hooks/useUnreadAnnouncementCount';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LocationSelect } from '@/components/ui/location-select';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  is_pinned: boolean;
  created_at: string;
  link_url: string | null;
  link_label: string | null;
  location_id: string | null;
}

const priorityColors: Record<Priority, string> = {
  low: 'border-l-muted-foreground',
  normal: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

const normalizeUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ─────────────────────────────────────────────
 *  TRIGGER (collapsed button in control row)
 * ───────────────────────────────────────────── */

interface AnnouncementsDrawerProps {
  isLeadership: boolean;
  label?: string;
  iconOnly?: boolean;
  /** Controlled mode: external expanded state */
  expanded?: boolean;
  /** Controlled mode: toggle callback */
  onToggle?: () => void;
}

export function AnnouncementsDrawer({
  isLeadership,
  label,
  iconOnly,
  expanded: controlledExpanded,
  onToggle,
}: AnnouncementsDrawerProps) {
  const { dashPath } = useOrgDashboardPath();
  const isControlled = typeof onToggle === 'function';
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isOpen = isControlled ? !!controlledExpanded : internalExpanded;

  const { data: unreadCount = 0 } = useUnreadAnnouncementCount();

  const handleClick = useCallback(() => {
    if (isControlled) {
      onToggle();
    } else {
      setInternalExpanded(prev => !prev);
    }
  }, [isControlled, onToggle]);

  // In controlled mode, render only the trigger button
  if (isControlled) {
    const Chevron = isOpen ? ChevronUp : ChevronDown;

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-2 h-9 rounded-md border text-sm font-sans transition-colors cursor-pointer whitespace-nowrap',
          isOpen
            ? 'border-primary/30 bg-accent/50 text-foreground'
            : 'border-border bg-background hover:bg-muted/50 text-foreground',
          iconOnly ? 'px-2.5' : 'px-4',
        )}
        title={iconOnly ? (label ?? 'Announcements') : undefined}
      >
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-3 h-3 text-primary" />
        </div>
        {!iconOnly && <span className="truncate">{label ?? 'Announcements'}</span>}
        {unreadCount > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full bg-destructive/20 text-destructive border border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)] text-[10px] font-medium flex items-center justify-center px-1 shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!iconOnly && <Chevron className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />}
      </motion.button>
    );
  }

  // Uncontrolled fallback — original inline behavior (kept for safety, not used in command center)
  return (
    <AnimatePresence mode="wait">
      {!isOpen ? (
        <motion.button
          key="collapsed"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-2 h-9 rounded-md border border-border bg-background text-sm font-sans hover:bg-muted/50 transition-colors cursor-pointer whitespace-nowrap',
            iconOnly ? 'px-2.5' : 'px-4',
          )}
          title={iconOnly ? (label ?? 'Announcements') : undefined}
        >
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-3 h-3 text-primary" />
          </div>
          {!iconOnly && <span className="truncate">{label ?? 'Announcements'}</span>}
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-destructive/20 text-destructive border border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)] text-[10px] font-medium flex items-center justify-center px-1 shrink-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {!iconOnly && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />}
        </motion.button>
      ) : (
        <AnnouncementsPanel isLeadership={isLeadership} onClose={() => setInternalExpanded(false)} />
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
 *  PANEL (expanded content — full-width row)
 * ───────────────────────────────────────────── */

interface AnnouncementsPanelProps {
  isLeadership: boolean;
  onClose: () => void;
}

export function AnnouncementsPanel({ isLeadership, onClose }: AnnouncementsPanelProps) {
  const { dashPath } = useOrgDashboardPath();
  const [locationFilter, setLocationFilter] = useState('all');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { assignedLocationIds, canViewAllLocations } = useUserLocationAccess();
  const lastAnnouncementIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  const { data: announcements } = useQuery({
    queryKey: ['announcements-drawer', assignedLocationIds, canViewAllLocations],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (!canViewAllLocations && assignedLocationIds.length > 0) {
        query = query.or(`location_id.is.null,location_id.in.(${assignedLocationIds.join(',')})`);
      }

      const { data, error } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as Announcement[];
    },
  });

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    if (locationFilter === 'all') return announcements;
    return announcements.filter(
      a => a.location_id === null || a.location_id === locationFilter
    );
  }, [announcements, locationFilter]);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('announcements-widget-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['announcements-drawer'] });
        queryClient.invalidateQueries({ queryKey: ['unread-announcement-count'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Mark as read when panel mounts
  useEffect(() => {
    if (!user?.id || !announcements || announcements.length === 0) return;

    const markAsRead = async () => {
      const { data: existingReads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = new Set(existingReads?.map(r => r.announcement_id) || []);
      const unread = announcements.filter(a => !readIds.has(a.id));
      if (unread.length === 0) return;

      const { error } = await supabase
        .from('announcement_reads')
        .insert(unread.map(a => ({ announcement_id: a.id, user_id: user.id })));

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['unread-announcement-count'] });
        queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
      }
    };

    markAsRead();
  }, [announcements, user?.id, queryClient]);

  return (
    <div className="w-full rounded-xl shadow-lg border border-border/40 bg-card overflow-hidden">
      {/* Top gradient accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xs tracking-[0.15em]">ANNOUNCEMENTS</span>
          <div className="flex items-center gap-1">
            <LocationSelect
              value={locationFilter}
              onValueChange={setLocationFilter}
              includeAll
              allLabel="All Locations"
              triggerClassName="h-7 text-xs bg-muted/30 border-border/40 w-auto min-w-0 max-w-[240px] px-2 whitespace-nowrap"
            />
            {isLeadership && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link to={dashPath('/announcements')}>
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link to={dashPath('/announcements/create')}>
                    <Plus className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[65vh]">
        <div className="px-4 pb-3 space-y-3">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement, i) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                className={`group relative p-4 rounded-xl bg-muted/30 border border-border/40 border-l-[3px] ${priorityColors[announcement.priority || 'normal']} hover:bg-muted/50 transition-all duration-200`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {announcement.is_pinned && (
                        <Pin className="w-3 h-3 text-oat shrink-0" />
                      )}
                      <h3 className="text-sm font-medium truncate">{announcement.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground/60 tracking-wide">
                        {formatDate(announcement.created_at)}
                      </span>
                      {announcement.link_url && (
                        <a
                          href={normalizeUrl(announcement.link_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          {announcement.link_label || 'Learn more'}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-14 text-muted-foreground">
              <Megaphone className="w-7 h-7 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-display">No announcements</p>
              <p className="text-xs mt-1 text-muted-foreground/60">You're all caught up</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 pb-4 pt-1">
        <Button variant="ghost" className="w-full justify-center text-xs h-9 text-muted-foreground hover:text-foreground" asChild>
          <Link to={dashPath('/announcements')}>
            View All Announcements
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
