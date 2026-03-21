import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { cn } from '@/lib/utils';
import { Megaphone, ChevronRight, Pin, ExternalLink } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';

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
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

interface SidebarAnnouncementsWidgetProps {
  onNavClick?: () => void;
}

export function SidebarAnnouncementsWidget({ onNavClick }: SidebarAnnouncementsWidgetProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const lastAnnouncementIdRef = useRef<string | null>(null);
  
  // Get user's location access
  const { assignedLocationIds, canViewAllLocations } = useUserLocationAccess();

  // Fetch active announcements filtered by location
  const { data: announcements = [] } = useQuery({
    queryKey: ['sidebar-announcements', user?.id, assignedLocationIds, canViewAllLocations],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('announcements')
        .select('id, title, content, priority, is_pinned, created_at, link_url, link_label, location_id')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      // Filter by location if user doesn't have full access
      if (!canViewAllLocations && assignedLocationIds.length > 0) {
        // Show company-wide (null) OR user's assigned locations
        query = query.or(`location_id.is.null,location_id.in.(${assignedLocationIds.join(',')})`);
      }

      const { data, error } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data || []) as Announcement[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Auto-expand when new announcement is detected
  useEffect(() => {
    if (announcements.length > 0) {
      const latestId = announcements[0].id;
      if (lastAnnouncementIdRef.current && lastAnnouncementIdRef.current !== latestId) {
        // New announcement detected - expand the widget
        setIsExpanded(true);
      }
      lastAnnouncementIdRef.current = latestId;
    }
  }, [announcements]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('sidebar-announcements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-announcements'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  if (announcements.length === 0) return null;

  return (
    <div className="border-b border-border">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider font-display font-medium">
            Announcements
          </span>
          <span className="text-xs text-muted-foreground">({announcements.length})</span>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      {/* Expandable content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-3 pb-3 space-y-2">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={cn(
                "p-3 bg-muted/50 border border-border/50 border-l-2 rounded-md text-xs",
                priorityColors[announcement.priority]
              )}
            >
              <div className="flex items-start gap-1.5 mb-1">
                {announcement.is_pinned && (
                  <Pin className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                )}
                <p className="font-medium line-clamp-1">{announcement.title}</p>
              </div>
              <p className="text-muted-foreground line-clamp-2 mb-2">
                {announcement.content}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground/60 text-[10px]">
                  {formatDate(new Date(announcement.created_at), 'MMM d')}
                </span>
                {announcement.link_url && announcement.link_label && (
                  <a
                    href={normalizeUrl(announcement.link_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded hover:opacity-90 transition-opacity"
                  >
                    {announcement.link_label}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* View all link */}
          <Link
            to="/dashboard/admin/announcements"
            onClick={onNavClick}
            className="block text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            View all announcements →
          </Link>
        </div>
      </div>
    </div>
  );
}
