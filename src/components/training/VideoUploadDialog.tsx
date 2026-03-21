import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, X, Link as LinkIcon } from 'lucide-react';

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

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: TrainingVideo | null;
}

const categories = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'client_engine', label: 'Client Engine Program' },
  { value: 'technique', label: 'Technique' },
  { value: 'product', label: 'Product Knowledge' },
  { value: 'client-service', label: 'Client Service' },
];

const availableRoles = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'stylist', label: 'Stylist' },
  { value: 'stylist_assistant', label: 'Assistant' },
  { value: 'receptionist', label: 'Front Desk' },
  { value: 'booth_renter', label: 'Booth Renter' },
];

export function VideoUploadDialog({
  open,
  onOpenChange,
  video,
}: VideoUploadDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!video;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('onboarding');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');

  // Get max order_index for new videos
  const { data: maxOrder } = useQuery({
    queryKey: ['training-videos-max-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_videos')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1);
      return data?.[0]?.order_index || 0;
    },
    enabled: !isEditing,
  });

  // Reset form when dialog opens/closes or video changes
  useEffect(() => {
    if (open) {
      if (video) {
        setTitle(video.title);
        setDescription(video.description || '');
        setCategory(video.category);
        setDuration(video.duration_minutes?.toString() || '');
        setVideoUrl(video.video_url || '');
        setSelectedRoles(video.required_for_roles || []);
        setIsActive(video.is_active);
      } else {
        setTitle('');
        setDescription('');
        setCategory('onboarding');
        setDuration('');
        setVideoUrl('');
        setSelectedRoles([]);
        setIsActive(true);
      }
    }
  }, [open, video]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description: description || null,
        category,
        duration_minutes: duration ? parseInt(duration) : null,
        video_url: videoUrl || null,
        required_for_roles: selectedRoles.length > 0 ? selectedRoles as any : null,
        is_active: isActive,
        order_index: isEditing ? video.order_index : (maxOrder || 0) + 1,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('training_videos')
          .update(payload)
          .eq('id', video.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_videos')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['training-videos-max-order'] });
      toast.success(isEditing ? 'Video updated' : 'Video added');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save video');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File size must be less than 500MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('training-videos')
        .upload(fileName, file);

      if (error) throw error;

      // Get signed URL for the video
      const { data: urlData } = await supabase.storage
        .from('training-videos')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

      if (urlData?.signedUrl) {
        setVideoUrl(urlData.signedUrl);
        toast.success('Video uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Training Video' : 'Add Training Video'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the training content"
              rows={3}
            />
          </div>

          {/* Category & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 15"
                min="1"
              />
            </div>
          </div>

          {/* Video Source */}
          <div className="space-y-3">
            <Label>Video Source</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={uploadMethod === 'url' ? 'default' : 'outline'}
                size={tokens.button.card}
                onClick={() => setUploadMethod('url')}
                className="gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                URL
              </Button>
              <Button
                type="button"
                variant={uploadMethod === 'upload' ? 'default' : 'outline'}
                size={tokens.button.card}
                onClick={() => setUploadMethod('upload')}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
            </div>

            {uploadMethod === 'url' ? (
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or direct video URL"
              />
            ) : (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading video...
                  </div>
                )}
                {videoUrl && !uploading && (
                  <p className="text-xs text-muted-foreground truncate">
                    Uploaded: {videoUrl.split('/').pop()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Role Visibility */}
          <div className="space-y-3">
            <Label>Visible to Roles</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty to show to all roles
            </p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <Badge
                  key={role.value}
                  variant={selectedRoles.includes(role.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleRole(role.value)}
                >
                  {role.label}
                  {selectedRoles.includes(role.value) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive videos are hidden from users
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || uploading}
            >
              {saveMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditing ? 'Save Changes' : 'Add Video'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
