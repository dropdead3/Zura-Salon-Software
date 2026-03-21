import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Lock, Eye, Save, X, Camera, ImageIcon, Loader2 } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useMeetingNotes, useCreateMeetingNote, useUpdateMeetingNote, useDeleteMeetingNote, type TopicCategory, type MeetingNote } from '@/hooks/useMeetingNotes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
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
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

const topicCategories: { value: TopicCategory; label: string; color: string }[] = [
  { value: 'performance', label: 'Performance', color: 'bg-primary/10 text-primary' },
  { value: 'goals', label: 'Goals', color: 'bg-chart-2/10 text-chart-2' },
  { value: 'feedback', label: 'Feedback', color: 'bg-chart-5/10 text-chart-5' },
  { value: 'development', label: 'Development', color: 'bg-chart-3/10 text-chart-3' },
  { value: 'personal', label: 'Personal', color: 'bg-chart-1/10 text-chart-1' },
  { value: 'other', label: 'Other', color: 'bg-muted text-muted-foreground' },
];

interface MeetingNotesProps {
  meetingId: string;
  isCoach: boolean;
}

export function MeetingNotes({ meetingId, isCoach }: MeetingNotesProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { data: notes, isLoading } = useMeetingNotes(meetingId);
  const createNote = useCreateMeetingNote();
  const updateNote = useUpdateMeetingNote();
  const deleteNote = useDeleteMeetingNote();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TopicCategory>('other');
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setContent('');
    setCategory('other');
    setIsPrivate(false);
    setPhotoUrls([]);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${meetingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('meeting-notes')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('meeting-notes')
          .getPublicUrl(fileName);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        setPhotoUrls(prev => [...prev, ...newUrls]);
        toast.success(`${newUrls.length} photo(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!content.trim() && photoUrls.length === 0) {
      toast.error('Please add note content or upload photos');
      return;
    }

    if (editingId) {
      await updateNote.mutateAsync({
        id: editingId,
        meeting_id: meetingId,
        content,
        topic_category: category,
        is_private: isPrivate,
        photo_urls: photoUrls,
      });
    } else {
      await createNote.mutateAsync({
        meeting_id: meetingId,
        content,
        topic_category: category,
        is_private: isPrivate,
        photo_urls: photoUrls,
      });
    }
    resetForm();
  };

  const handleEdit = (note: MeetingNote) => {
    setEditingId(note.id);
    setContent(note.content);
    setCategory(note.topic_category);
    setIsPrivate(note.is_private);
    setPhotoUrls(note.photo_urls || []);
    setIsAdding(true);
  };

  const handleDelete = async (noteId: string) => {
    await deleteNote.mutateAsync({ id: noteId, meeting_id: meetingId });
  };

  const getCategoryBadge = (cat: TopicCategory) => {
    const found = topicCategories.find(c => c.value === cat);
    return found ? (
      <Badge variant="outline" className={found.color}>
        {found.label}
      </Badge>
    ) : null;
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading notes...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Meeting Notes</CardTitle>
        {isCoach && !isAdding && (
          <Button size={tokens.button.card} onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Topic Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TopicCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {topicCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="private"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                  <Label htmlFor="private" className="flex items-center gap-1">
                    {isPrivate ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isPrivate ? 'Private' : 'Shared'}
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Note Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your meeting notes..."
                rows={4}
              />
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Handwritten Notes Photos
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <Dialog>
                      <DialogTrigger asChild>
                        <img
                          src={url}
                          alt={`Note photo ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <img src={url} alt={`Note photo ${index + 1}`} className="w-full h-auto" />
                      </DialogContent>
                    </Dialog>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-20 h-20 flex flex-col items-center justify-center gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-xs">Add Photo</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload photos of handwritten notes (max 10MB each)
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={(!content.trim() && photoUrls.length === 0) || createNote.isPending || updateNote.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {editingId ? 'Update' : 'Save'}
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes?.length === 0 && !isAdding && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No notes yet. {isCoach && 'Click "Add Note" to get started.'}
          </p>
        )}

        <div className="space-y-3">
          {notes?.map((note) => (
            <div key={note.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(note.topic_category)}
                  {note.is_private && (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  {isCoach && note.coach_id === user?.id && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(note)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(note.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
              
              {note.content && (
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              )}
              
              {/* Display Photos */}
              {note.photo_urls && note.photo_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {note.photo_urls.map((url, index) => (
                    <Dialog key={index}>
                      <DialogTrigger asChild>
                        <img
                          src={url}
                          alt={`Handwritten note ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                        <img src={url} alt={`Handwritten note ${index + 1}`} className="w-full h-auto" />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
