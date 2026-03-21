import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { MessageSquare, Send, Lock, Trash2, Loader2 } from 'lucide-react';
import { useClientNotes, useAddClientNote, useDeleteClientNote } from '@/hooks/useClientNotes';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ClientNotesSectionProps {
  clientId: string;
}

export function ClientNotesSection({ clientId }: ClientNotesSectionProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { data: notes, isLoading } = useClientNotes(clientId);
  const addNote = useAddClientNote();
  const deleteNote = useDeleteClientNote();
  
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    addNote.mutate({
      clientId,
      note: newNote.trim(),
      isPrivate,
    }, {
      onSuccess: () => {
        setNewNote('');
        setIsPrivate(false);
      },
    });
  };

  const handleDelete = (noteId: string) => {
    deleteNote.mutate({ noteId, clientId });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Card key={i} className="p-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Add a note about this client..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="private" 
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(checked === true)}
            />
            <Label htmlFor="private" className="text-sm text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Private (only visible to you)
            </Label>
          </div>
          <Button 
            type="submit" 
            size={tokens.button.card} 
            disabled={!newNote.trim() || addNote.isPending}
          >
            {addNote.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Add Note
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Notes List */}
      {notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map(note => {
            const isOwner = note.user_id === user?.id;
            const initials = note.author?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

            return (
              <Card 
                key={note.id} 
                className={cn(
                  "p-3",
                  note.is_private && "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={note.author?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {note.author?.display_name || note.author?.full_name || 'Unknown'}
                        </span>
                        {note.is_private && (
                          <Lock className="w-3 h-3 text-amber-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(note.created_at), 'MMM d, yyyy')}
                        </span>
                        {isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
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
                                <AlertDialogAction onClick={() => handleDelete(note.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{note.note}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a note to keep track of important details</p>
        </div>
      )}
    </div>
  );
}
