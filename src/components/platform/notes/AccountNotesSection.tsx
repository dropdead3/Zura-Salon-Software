import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { useAccountNotes, useCreateAccountNote, useDeleteAccountNote } from '@/hooks/useAccountNotes';
import { AccountNoteCard } from './AccountNoteCard';
import { MentionInput } from './MentionInput';

interface AccountNotesSectionProps {
  organizationId: string;
  organizationName: string;
}

export function AccountNotesSection({ organizationId, organizationName }: AccountNotesSectionProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  
  const { data: notes, isLoading } = useAccountNotes(organizationId);
  const createNote = useCreateAccountNote();
  const deleteNote = useDeleteAccountNote();
  
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    
    await createNote.mutateAsync({
      organizationId,
      content: newNoteContent.trim(),
      organizationName,
    });
    
    setNewNoteContent('');
  };
  
  const handleDeleteNote = (noteId: string) => {
    deleteNote.mutate({ noteId, organizationId });
  };
  
  return (
    <div className="space-y-6">
      {/* Add Note Form */}
       <PlatformCard variant="glass" size="container">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-400" />
            Add Note
          </PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <MentionInput
            value={newNoteContent}
            onChange={setNewNoteContent}
            placeholder="Leave a note about this account..."
            disabled={createNote.isPending}
          />
          <div className="flex justify-end">
            <PlatformButton
              onClick={handleAddNote}
              disabled={!newNoteContent.trim() || createNote.isPending}
            >
              {createNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Note
            </PlatformButton>
          </div>
        </PlatformCardContent>
      </PlatformCard>
      
      {/* Notes List */}
      <PlatformCard variant="glass" size="container">
        <PlatformCardHeader>
          <PlatformCardTitle>
            Notes ({notes?.length || 0})
          </PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <ZuraLoader size="xl" platformColors />
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map(note => (
                <AccountNoteCard
                  key={note.id}
                  note={note}
                  onDelete={handleDeleteNote}
                  isDeleting={deleteNote.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                No notes yet. Add a note to start the conversation.
              </p>
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
