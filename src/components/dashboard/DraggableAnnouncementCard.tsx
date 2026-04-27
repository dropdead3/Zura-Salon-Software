import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Pin, 
  Trash2, 
  Edit2, 
  GripVertical,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  ExternalLink,
  Globe,
  MapPin,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFormatDate } from '@/hooks/useFormatDate';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  is_pinned: boolean;
  is_active: boolean;
  author_id: string;
  expires_at: string | null;
  created_at: string;
  link_url: string | null;
  link_label: string | null;
  sort_order?: number;
}

const priorityConfig: Record<Priority, { label: string; icon: React.ReactNode; color: string }> = {
  low: { label: 'Low', icon: <Info className="w-4 h-4" />, color: 'text-muted-foreground' },
  normal: { label: 'Normal', icon: <Bell className="w-4 h-4" />, color: 'text-primary' },
  high: { label: 'High', icon: <AlertCircle className="w-4 h-4" />, color: 'text-warning-foreground' },
  urgent: { label: 'Urgent', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-destructive' },
};

const normalizeUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

interface DraggableAnnouncementCardProps {
  announcement: Announcement;
  togglingId: string | null;
  onToggleActive: (announcement: Announcement) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
  isDraggable?: boolean;
  locationName?: string | null;
  readStats?: { audience_count: number; read_count: number; read_rate: number };
}

export function DraggableAnnouncementCard({
  announcement,
  togglingId,
  onToggleActive,
  onEdit,
  onDelete,
  isDraggable = false,
  locationName,
  readStats,
}: DraggableAnnouncementCardProps) {
  const { formatDate } = useFormatDate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: announcement.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`p-6 transition-all duration-300 ${!announcement.is_active ? 'opacity-50 hover:opacity-100' : ''} ${togglingId === announcement.id ? 'scale-[0.98] ring-2 ring-primary/30' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        {isDraggable && (
          <div 
            className="flex items-center cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {announcement.is_pinned && (
              <Pin className="w-4 h-4 text-foreground" />
            )}
            <span className={`flex items-center gap-1 text-xs font-medium ${priorityConfig[announcement.priority].color}`}>
              {priorityConfig[announcement.priority].icon}
              {priorityConfig[announcement.priority].label}
            </span>
            {!announcement.is_active && (
              <span className="text-xs bg-muted px-2 py-0.5">Inactive</span>
            )}
            {/* Location badge */}
            <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
              {locationName ? (
                <>
                  <MapPin className="w-3 h-3" />
                  {locationName}
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3" />
                  Company-Wide
                </>
              )}
            </Badge>
          </div>
          <h3 className="font-display text-lg mb-2">{announcement.title}</h3>
          <p className="text-sm text-muted-foreground font-sans whitespace-pre-wrap">
            {announcement.content}
          </p>
          {announcement.link_url && announcement.link_label && (
            <a 
              href={normalizeUrl(announcement.link_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium bg-foreground text-background rounded hover:opacity-90 transition-opacity"
            >
              {announcement.link_label}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Posted {formatDate(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
            {announcement.expires_at && (
              <span> · Expires {formatDate(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onToggleActive(announcement)}
          >
            <span className={`text-xs whitespace-nowrap ${announcement.is_active ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
              {announcement.is_active ? 'Displaying on team dashboards' : 'Announcement not displaying'}
            </span>
            <Switch checked={announcement.is_active} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(announcement)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('Delete this announcement?')) {
                onDelete(announcement.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
