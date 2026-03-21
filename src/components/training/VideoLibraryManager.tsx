import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plus,
  Video,
  Pencil,
  Trash2,
  Clock,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { VideoUploadDialog } from './VideoUploadDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TrainingVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  category: string;
  duration_minutes: number | null;
  order_index: number;
  required_for_roles: string[] | null;
  is_active: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  client_engine: 'Client Engine Program',
  technique: 'Technique',
  product: 'Product Knowledge',
  'client-service': 'Client Service',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Stylist',
  stylist_assistant: 'Assistant',
  receptionist: 'Front Desk',
  booth_renter: 'Booth Renter',
};

export function VideoLibraryManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [deleteVideo, setDeleteVideo] = useState<TrainingVideo | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['training-videos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('training_videos')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos-admin'] });
      toast.success('Video status updated');
    },
    onError: () => {
      toast.error('Failed to update video status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos-admin'] });
      toast.success('Video deleted');
      setDeleteVideo(null);
    },
    onError: () => {
      toast.error('Failed to delete video');
    },
  });

  const handleEdit = (video: TrainingVideo) => {
    setEditingVideo(video);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingVideo(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Video Library</h2>
          <p className="text-sm text-muted-foreground">
            {videos.length} training videos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Video
        </Button>
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No training videos yet</p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            Add your first video
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card
              key={video.id}
              className={`overflow-hidden transition-opacity ${
                !video.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Video className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="absolute top-2 left-2">
                  <GripVertical className="w-5 h-5 text-white/70 cursor-grab" />
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Category & Duration */}
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="secondary">
                    {categoryLabels[video.category] || video.category}
                  </Badge>
                  {video.duration_minutes && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {video.duration_minutes} min
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-medium line-clamp-2">{video.title}</h3>

                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {video.required_for_roles?.length ? (
                    video.required_for_roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {roleLabels[role] || role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      All Roles
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={video.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({
                          id: video.id,
                          is_active: checked,
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {video.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(video)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteVideo(video)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload/Edit Dialog */}
      <VideoUploadDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        video={editingVideo}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVideo} onOpenChange={() => setDeleteVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteVideo?.title}" and all associated
              progress data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideo && deleteMutation.mutate(deleteVideo.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
