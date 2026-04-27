import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Pin, 
  Pencil, 
  ChevronDown,
  ExternalLink,
  Plus,
  Globe,
  MapPin,
} from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { useActiveLocations } from '@/hooks/useLocations';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useMarkAnnouncementsRead } from '@/hooks/useMarkAnnouncementsRead';


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

interface AnnouncementsBentoProps {
  announcements: Announcement[] | undefined;
  isLeadership: boolean;
}

const priorityColors: Record<Priority, string> = {
  low: 'border-muted-foreground',
  normal: 'border-blue-500',
  high: 'border-orange-500',
  urgent: 'border-red-500',
};

const normalizeUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export function AnnouncementsBento({
  announcements, isLeadership }: AnnouncementsBentoProps) {
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const { data: locations = [] } = useActiveLocations();
  
  // Filter announcements based on location selection
  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    if (locationFilter === 'all') return announcements;
    if (locationFilter === 'company-wide') {
      return announcements.filter(a => a.location_id === null);
    }
    return announcements.filter(a => a.location_id === locationFilter);
  }, [announcements, locationFilter]);
  
  const hasAnnouncements = filteredAnnouncements.length > 0;
  const displayedAnnouncements = filteredAnnouncements.slice(0, 3);
  const totalCount = filteredAnnouncements.length;

  // Mark visible announcements as read when the card is expanded.
  useMarkAnnouncementsRead(
    displayedAnnouncements.map(a => a.id),
    isExpanded && hasAnnouncements,
  );

  return (
    <Card className="p-6 rounded-xl backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <h2 className="font-display text-xs tracking-[0.15em]">ANNOUNCEMENTS</h2>
                <ChevronDown 
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300 ease-out",
                    isExpanded && "rotate-180"
                  )} 
                />
              </button>
            </CollapsibleTrigger>
            
            {/* Location Filter Dropdown */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-7 w-[130px] text-xs border-border">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="company-wide">Company-Wide</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-3">
            {isLeadership && (
              <>
                <Link 
                  to={dashPath('/admin/announcements')} 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Manage announcements"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <Link 
                  to={dashPath('/admin/announcements?create=true')} 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Create new announcement"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </>
            )}
            {totalCount > 3 && (
              <Button variant="ghost" size={tokens.button.card} asChild className="text-xs h-7">
                <Link to={dashPath('/admin/announcements')}>
                  View All ({totalCount})
                </Link>
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          {hasAnnouncements ? (
            <div className="grid gap-4 md:grid-cols-3">
              {displayedAnnouncements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className={cn(
                    "group relative p-4 bg-card-inner border-l-4 rounded-r-lg transition-all hover:bg-muted/70 dark:hover:bg-card/80 hover:translate-x-0.5",
                    priorityColors[announcement.priority]
                  )}
                >
                  {isLeadership && (
                    <Link 
                      to={`/dashboard/admin/announcements?edit=${announcement.id}`}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    <p className="text-sm font-sans font-medium line-clamp-1">{announcement.title}</p>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                    {announcement.content}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 tracking-wide">
                      <span>{formatDate(new Date(announcement.created_at), 'MMM d')}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        {announcement.location_id ? (
                          <>
                            <MapPin className="w-3 h-3" />
                            {locations.find(l => l.id === announcement.location_id)?.name || 'Location'}
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            All
                          </>
                        )}
                      </span>
                    </div>
                    
                    {announcement.link_url && announcement.link_label && (
                      <a 
                        href={normalizeUrl(announcement.link_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-foreground text-background rounded hover:opacity-90 transition-opacity"
                      >
                        {announcement.link_label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-card-inner border-l-4 border-foreground rounded-r-lg">
              <p className="text-sm font-sans font-medium">Welcome to your team!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your onboarding to get started
              </p>
            </div>
          )}
        </CollapsibleContent>
        
        {/* Collapsed state preview */}
        {!isExpanded && hasAnnouncements && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{totalCount} announcement{totalCount !== 1 ? 's' : ''}</span>
            {displayedAnnouncements.some(a => a.is_pinned) && (
              <span className="flex items-center gap-1 text-xs">
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}
          </div>
        )}
      </Collapsible>
    </Card>
  );
}
