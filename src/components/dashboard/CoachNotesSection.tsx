import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  MessageSquare, 
  Plus, 
  Send, 
  Loader2, 
  Trash2,
  Pencil,
  X,
  Check,
  StickyNote,
} from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface CoachNote {
  id: string;
  enrollment_id: string;
  coach_user_id: string;
  note_text: string;
  note_type: string | null;
  created_at: string;
  updated_at: string;
}

interface CoachNotesSectionProps {
  enrollmentId: string;
  participantName: string;
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-muted text-muted-foreground' },
  { value: 'praise', label: 'Praise', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  { value: 'concern', label: 'Concern', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { value: 'action', label: 'Action Item', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { value: 'followup', label: 'Follow-up', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
];

export function CoachNotesSection({ enrollmentId, participantName }: CoachNotesSectionProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['coach-notes', enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_notes')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CoachNote[];
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newNoteText.trim()) return;

      const { error } = await supabase
        .from('coach_notes')
        .insert({
          enrollment_id: enrollmentId,
          coach_user_id: user.id,
          note_text: newNoteText.trim(),
          note_type: newNoteType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes', enrollmentId] });
      setNewNoteText('');
      setNewNoteType('general');
      setIsAdding(false);
      toast({ title: 'Note added', description: 'Your note has been saved.' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add note',
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from('coach_notes')
        .update({ note_text: text, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes', enrollmentId] });
      setEditingId(null);
      setEditText('');
      toast({ title: 'Note updated' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update note',
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coach_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes', enrollmentId] });
      toast({ title: 'Note deleted' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete note',
      });
    },
  });

  const startEdit = (note: CoachNote) => {
    setEditingId(note.id);
    setEditText(note.note_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      updateNoteMutation.mutate({ id, text: editText.trim() });
    }
  };

  const getNoteTypeConfig = (type: string | null) => {
    return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0];
  };

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Coach Notes</h4>
          {notes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {notes.length}
            </Badge>
          )}
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size={tokens.button.inline}
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Select value={newNoteType} onValueChange={setNewNoteType}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              for {participantName}
            </span>
          </div>
          <Textarea
            placeholder="Write your note here..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size={tokens.button.inline}
              onClick={() => {
                setIsAdding(false);
                setNewNoteText('');
                setNewNoteType('general');
              }}
            >
              Cancel
            </Button>
            <Button
              size={tokens.button.inline}
              onClick={() => addNoteMutation.mutate()}
              disabled={!newNoteText.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {notes.map((note) => {
            const typeConfig = getNoteTypeConfig(note.note_type);
            const isEditing = editingId === note.id;
            const isOwnNote = note.coach_user_id === user?.id;

            return (
              <div
                key={note.id}
                className={cn(
                  "p-3 rounded-lg border text-sm",
                  isEditing ? "bg-muted" : "bg-background"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className={cn("text-[10px]", typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(new Date(note.created_at), 'MMM d, h:mm a')}
                    </span>
                    {isOwnNote && !isEditing && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => startEdit(note)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this note? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNoteMutation.mutate(note.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px] text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size={tokens.button.inline}
                        onClick={cancelEdit}
                        className="h-7"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size={tokens.button.inline}
                        onClick={() => saveEdit(note.id)}
                        disabled={!editText.trim() || updateNoteMutation.isPending}
                        className="h-7"
                      >
                        {updateNoteMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                )}

                {note.created_at !== note.updated_at && !isEditing && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    (edited {formatDate(new Date(note.updated_at), 'MMM d')})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
