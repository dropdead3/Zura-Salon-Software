import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Video, 
  Image, 
  File, 
  Upload, 
  Loader2,
  ExternalLink,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProgramResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  week_id: string | null;
  display_order: number;
  is_active: boolean;
}

interface ProgramWeek {
  id: string;
  week_number: number;
  title: string;
}

const FILE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  video: Video,
  image: Image,
  document: FileText,
  other: File,
};

export default function ProgramResourcesEditor() {
  const [resources, setResources] = useState<ProgramResource[]>([]);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingResource, setEditingResource] = useState<ProgramResource | null>(null);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
    week_id: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resourcesResult, weeksResult] = await Promise.all([
        supabase
          .from('program_resources')
          .select('*')
          .order('display_order'),
        supabase
          .from('program_weeks')
          .select('id, week_number, title')
          .eq('is_active', true)
          .order('week_number'),
      ]);

      if (resourcesResult.data) setResources(resourcesResult.data);
      if (weeksResult.data) setWeeks(weeksResult.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `program-resources/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('proof-uploads')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload file');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('proof-uploads')
      .getPublicUrl(filePath);

    // Determine file type
    let fileType = 'other';
    if (['pdf'].includes(fileExt)) fileType = 'pdf';
    else if (['mp4', 'mov', 'avi', 'webm'].includes(fileExt)) fileType = 'video';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) fileType = 'image';
    else if (['doc', 'docx', 'txt'].includes(fileExt)) fileType = 'document';

    setNewResource({
      ...newResource,
      file_url: urlData.publicUrl,
      file_type: fileType,
      title: newResource.title || file.name.replace(/\.[^/.]+$/, ''),
    });

    toast.success('File uploaded');
    setUploading(false);
  };

  const addResource = async () => {
    if (!newResource.title || !newResource.file_url) {
      toast.error('Title and file are required');
      return;
    }

    const { data, error } = await supabase
      .from('program_resources')
      .insert({
        title: newResource.title,
        description: newResource.description || null,
        file_url: newResource.file_url,
        file_type: newResource.file_type,
        week_id: newResource.week_id || null,
        display_order: resources.length + 1,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add resource');
      return;
    }

    setResources([...resources, data]);
    setNewResource({ title: '', description: '', file_url: '', file_type: 'pdf', week_id: '' });
    setIsAdding(false);
    toast.success('Resource added');
  };

  const updateResource = async (resource: ProgramResource) => {
    const { error } = await supabase
      .from('program_resources')
      .update({
        title: resource.title,
        description: resource.description,
        file_type: resource.file_type,
        week_id: resource.week_id,
        is_active: resource.is_active,
      })
      .eq('id', resource.id);

    if (error) {
      toast.error('Failed to update resource');
      return;
    }

    setResources(resources.map(r => r.id === resource.id ? resource : r));
    setEditingResource(null);
    toast.success('Resource updated');
  };

  const deleteResource = async (id: string) => {
    const { error } = await supabase
      .from('program_resources')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete resource');
      return;
    }

    setResources(resources.filter(r => r.id !== id));
    toast.success('Resource deleted');
  };

  const toggleResourceActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('program_resources')
      .update({ is_active: active })
      .eq('id', id);

    if (!error) {
      setResources(resources.map(r => r.id === id ? { ...r, is_active: active } : r));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Program Resources</h3>
          <p className="text-sm text-muted-foreground">
            Manage downloadable PDFs, worksheets, and other materials
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Add Resource Form */}
      {isAdding && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.mp4,.mov,.jpg,.jpeg,.png,.gif"
            />
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {newResource.file_url ? 'Change File' : 'Upload File'}
              </Button>

              {newResource.file_url && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  File uploaded
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Resource title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Link to Week (optional)</Label>
                <Select
                  value={newResource.week_id}
                  onValueChange={(v) => setNewResource({ ...newResource, week_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Global resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Global (all weeks)</SelectItem>
                    {weeks.map((week) => (
                      <SelectItem key={week.id} value={week.id}>
                        Week {week.week_number}: {week.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAdding(false);
                setNewResource({ title: '', description: '', file_url: '', file_type: 'pdf', week_id: '' });
              }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={addResource} disabled={!newResource.title || !newResource.file_url}>
                <Check className="w-4 h-4 mr-1" /> Add Resource
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources List */}
      <div className="space-y-3">
        {resources.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No resources yet</p>
            <p className="text-sm text-muted-foreground">Add PDFs, worksheets, and other materials for participants</p>
          </Card>
        ) : (
          resources.map((resource) => {
            const Icon = FILE_TYPE_ICONS[resource.file_type] || File;
            const linkedWeek = weeks.find(w => w.id === resource.week_id);

            return (
              <Card key={resource.id} className={`p-4 ${!resource.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{resource.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {resource.file_type}
                      </Badge>
                      {linkedWeek && (
                        <Badge variant="outline" className="text-[10px]">
                          Week {linkedWeek.week_number}
                        </Badge>
                      )}
                    </div>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {resource.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Switch
                      checked={resource.is_active}
                      onCheckedChange={(checked) => toggleResourceActive(resource.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingResource(resource)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{resource.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteResource(resource.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Resource Dialog */}
      {editingResource && (
        <AlertDialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Resource</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Link to Week</Label>
                <Select
                  value={editingResource.week_id || ''}
                  onValueChange={(v) => setEditingResource({ ...editingResource, week_id: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Global resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Global (all weeks)</SelectItem>
                    {weeks.map((week) => (
                      <SelectItem key={week.id} value={week.id}>
                        Week {week.week_number}: {week.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => updateResource(editingResource)}>
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
