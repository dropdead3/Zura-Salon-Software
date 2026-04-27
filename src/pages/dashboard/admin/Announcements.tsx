import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Megaphone, 
  Pin, 
  Loader2,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  Globe,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useActiveLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableAnnouncementCard } from '@/components/dashboard/DraggableAnnouncementCard';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { useAnnouncementReadStats } from '@/hooks/useAnnouncementReadStats';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  is_pinned: boolean;
  is_active: boolean;
  author_id: string;
  organization_id: string;
  expires_at: string | null;
  created_at: string;
  link_url: string | null;
  link_label: string | null;
  sort_order: number;
  location_id: string | null;
}

const priorityConfig: Record<Priority, { label: string; icon: React.ReactNode; color: string }> = {
  low: { label: 'Low', icon: <Info className="w-4 h-4" />, color: 'text-muted-foreground' },
  normal: { label: 'Normal', icon: <Bell className="w-4 h-4" />, color: 'text-blue-600' },
  high: { label: 'High', icon: <AlertCircle className="w-4 h-4" />, color: 'text-orange-600' },
  urgent: { label: 'Urgent', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600' },
};

const normalizeUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export default function Announcements() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Fetch all active locations for the audience selector
  const { data: locations = [] } = useActiveLocations();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Announcement[];
    },
  });

  // Separate pinned and unpinned announcements
  const pinnedAnnouncements = useMemo(() => 
    announcements?.filter(a => a.is_pinned) || [], 
    [announcements]
  );
  const unpinnedAnnouncements = useMemo(() => 
    announcements?.filter(a => !a.is_pinned) || [], 
    [announcements]
  );

  // Read-receipt analytics, keyed by announcement_id
  const announcementIds = useMemo(
    () => (announcements ?? []).map((a) => a.id),
    [announcements]
  );
  const { data: readStats } = useAnnouncementReadStats(announcementIds);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mutation for updating sort order
  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('announcements')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Order updated');
    },
    onError: (error) => {
      toast.error('Failed to update order');
      console.error(error);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = pinnedAnnouncements.findIndex(a => a.id === active.id);
      const newIndex = pinnedAnnouncements.findIndex(a => a.id === over.id);
      
      const newOrder = arrayMove(pinnedAnnouncements, oldIndex, newIndex);
      const updates = newOrder.map((announcement, index) => ({
        id: announcement.id,
        sort_order: index + 1,
      }));
      
      reorderMutation.mutate(updates);
    }
  };

  // Handle edit query parameter from Command Center
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && announcements) {
      const announcementToEdit = announcements.find(a => a.id === editId);
      if (announcementToEdit) {
        setEditingAnnouncement(announcementToEdit);
        setTitle(announcementToEdit.title);
        setContent(announcementToEdit.content);
        setPriority(announcementToEdit.priority);
        setIsPinned(announcementToEdit.is_pinned);
        setExpiresAt(announcementToEdit.expires_at?.split('T')[0] || '');
        setLinkUrl(announcementToEdit.link_url || '');
        setLinkLabel(announcementToEdit.link_label || '');
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, announcements, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: async (newAnnouncement: Omit<Announcement, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('announcements')
        .insert(newAnnouncement);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement created');
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create announcement');
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Announcement> & { id: string }) => {
      const { error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated');
      resetForm();
      setEditingAnnouncement(null);
    },
    onError: (error) => {
      toast.error('Failed to update announcement');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete announcement');
      console.error(error);
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setIsPinned(false);
    setExpiresAt('');
    setLinkUrl('');
    setLinkLabel('');
    setLocationId(null);
  };

  const handleCreate = () => {
    if (!user) return;
    // Get max sort_order for pinned announcements
    const maxSortOrder = pinnedAnnouncements.length > 0 
      ? Math.max(...pinnedAnnouncements.map(a => a.sort_order || 0)) 
      : 0;
    
    createMutation.mutate({
      title,
      content,
      priority,
      is_pinned: isPinned,
      is_active: true,
      author_id: user.id,
      expires_at: expiresAt || null,
      link_url: linkUrl || null,
      link_label: linkLabel || null,
      sort_order: isPinned ? maxSortOrder + 1 : 0,
      location_id: locationId,
    });
  };

  const handleUpdate = () => {
    if (!editingAnnouncement) return;
    updateMutation.mutate({
      id: editingAnnouncement.id,
      title,
      content,
      priority,
      is_pinned: isPinned,
      expires_at: expiresAt || null,
      link_url: linkUrl || null,
      link_label: linkLabel || null,
      location_id: locationId,
    });
  };

  const openEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setPriority(announcement.priority);
    setIsPinned(announcement.is_pinned);
    setExpiresAt(announcement.expires_at?.split('T')[0] || '');
    setLinkUrl(announcement.link_url || '');
    setLinkLabel(announcement.link_label || '');
    setLocationId(announcement.location_id);
  };
  
  // Get location name by ID for display
  const getLocationName = (locId: string | null) => {
    if (!locId) return null;
    return locations.find(l => l.id === locId)?.name || locId;
  };

  const toggleActive = (announcement: Announcement) => {
    setTogglingId(announcement.id);
    updateMutation.mutate({
      id: announcement.id,
      is_active: !announcement.is_active,
    }, {
      onSettled: () => {
        // Keep the animation visible for a moment
        setTimeout(() => setTogglingId(null), 400);
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <DashboardPageHeader
            title="Make An Announcement"
            description="Post updates and news for the team"
            actions={
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
        <PageExplainer pageId="announcements" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display">Create Announcement</DialogTitle>
                  </DialogHeader>
                  <AnnouncementForm
                    title={title}
                    setTitle={setTitle}
                    content={content}
                    setContent={setContent}
                    priority={priority}
                    setPriority={setPriority}
                    isPinned={isPinned}
                    setIsPinned={setIsPinned}
                    expiresAt={expiresAt}
                    setExpiresAt={setExpiresAt}
                    linkUrl={linkUrl}
                    setLinkUrl={setLinkUrl}
                    linkLabel={linkLabel}
                    setLinkLabel={setLinkLabel}
                    locationId={locationId}
                    setLocationId={setLocationId}
                    locations={locations}
                    onSubmit={handleCreate}
                    isLoading={createMutation.isPending}
                    submitLabel="Create Announcement"
                  />
                </DialogContent>
              </Dialog>
            }
          />
        </div>

        {isLoading ? (
          <DashboardLoader size="lg" className="py-20" />
        ) : announcements?.length === 0 ? (
          <Card className="p-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-display text-lg mb-2">No Announcements</h3>
            <p className="text-sm text-muted-foreground font-sans">
              Create your first announcement to share news with the team.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pinned Announcements - Draggable */}
            {pinnedAnnouncements.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Pin className="w-3 h-3" />
                  Pinned Announcements
                  <span className="text-muted-foreground/60">· Drag to reorder</span>
                </h2>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={pinnedAnnouncements.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {pinnedAnnouncements.map((announcement) => (
                        <DraggableAnnouncementCard
                          key={announcement.id}
                          announcement={announcement}
                          togglingId={togglingId}
                          onToggleActive={toggleActive}
                          onEdit={openEdit}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          isDraggable={true}
                          locationName={getLocationName(announcement.location_id)}
                          readStats={readStats?.[announcement.id]}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Unpinned Announcements */}
            {unpinnedAnnouncements.length > 0 && (
              <div>
                {pinnedAnnouncements.length > 0 && (
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Other Announcements
                  </h2>
                )}
                <div className="space-y-4">
                  {unpinnedAnnouncements.map((announcement) => (
                    <DraggableAnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      togglingId={togglingId}
                      onToggleActive={toggleActive}
                      onEdit={openEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDraggable={false}
                      locationName={getLocationName(announcement.location_id)}
                      readStats={readStats?.[announcement.id]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Announcement</DialogTitle>
            </DialogHeader>
            <AnnouncementForm
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              priority={priority}
              setPriority={setPriority}
              isPinned={isPinned}
              setIsPinned={setIsPinned}
              expiresAt={expiresAt}
              setExpiresAt={setExpiresAt}
              linkUrl={linkUrl}
              setLinkUrl={setLinkUrl}
              linkLabel={linkLabel}
              setLinkLabel={setLinkLabel}
              locationId={locationId}
              setLocationId={setLocationId}
              locations={locations}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

interface AnnouncementFormProps {
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  priority: Priority;
  setPriority: (v: Priority) => void;
  isPinned: boolean;
  setIsPinned: (v: boolean) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  linkUrl: string;
  setLinkUrl: (v: string) => void;
  linkLabel: string;
  setLinkLabel: (v: string) => void;
  locationId: string | null;
  setLocationId: (v: string | null) => void;
  locations: { id: string; name: string }[];
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}

function AnnouncementForm({
  title,
  setTitle,
  content,
  setContent,
  priority,
  setPriority,
  isPinned,
  setIsPinned,
  expiresAt,
  setExpiresAt,
  linkUrl,
  setLinkUrl,
  linkLabel,
  setLinkLabel,
  locationId,
  setLocationId,
  locations,
  onSubmit,
  isLoading,
  submitLabel,
}: AnnouncementFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your announcement..."
          rows={4}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="expires">Expires (optional)</Label>
          <Input
            id="expires"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Audience</Label>
        <Select 
          value={locationId || 'all'} 
          onValueChange={(v) => setLocationId(v === 'all' ? null : v)}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              {locationId ? (
                <MapPin className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground" />
              )}
              <SelectValue placeholder="Select audience" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                All Locations (Company-Wide)
              </div>
            </SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {loc.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs uppercase tracking-wide">Link Button (optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Button label"
          />
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Switch
          id="pinned"
          checked={isPinned}
          onCheckedChange={setIsPinned}
        />
        <Label htmlFor="pinned" className="font-normal">Pin to top</Label>
      </div>
      
      <Button 
        onClick={onSubmit} 
        disabled={isLoading || !title.trim() || !content.trim()}
        className="w-full"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </div>
  );
}
