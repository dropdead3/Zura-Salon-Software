import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Trash2, Lock, StickyNote } from 'lucide-react';
import { useAppointmentNotes } from '@/hooks/useAppointmentNotes';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface AppointmentNotesPanelProps {
  appointmentId: string | null;
}

export function AppointmentNotesPanel({ appointmentId }: AppointmentNotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const { notes, isLoading, addNote, deleteNote, isAdding } = useAppointmentNotes(appointmentId);
  const { hasPermission } = useAuth();
  const canAdd = hasPermission('add_appointment_notes');

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    addNote({ note: newNote.trim(), isPrivate });
    setNewNote('');
    setIsPrivate(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      {canAdd && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[72px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={isPrivate}
                onCheckedChange={(v) => setIsPrivate(!!v)}
                className="h-3.5 w-3.5"
              />
              <Lock className="h-3 w-3" />
              Private note
            </label>
            <Button
              size={tokens.button.inline}
              onClick={handleSubmit}
              disabled={!newNote.trim() || isAdding}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className={tokens.empty.container}>
          <StickyNote className={tokens.empty.icon} />
          <p className={tokens.empty.description}>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const authorName = note.author?.display_name || note.author?.full_name || 'Unknown';
            const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={note.id} className="group flex gap-3 text-sm">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  {note.author?.photo_url && <AvatarImage src={note.author.photo_url} />}
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{authorName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(note.created_at), 'MMM d, h:mm a')}
                    </span>
                    {note.is_private && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap mt-0.5">{note.note}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
