import { format } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { highlightMentions } from '@/hooks/useAccountNotes';
import { useAuth } from '@/contexts/AuthContext';

interface AccountNoteCardProps {
  note: {
    id: string;
    author_id: string;
    content: string;
    created_at: string;
    author?: {
      full_name: string;
      email: string;
    };
  };
  onDelete: (noteId: string) => void;
  isDeleting?: boolean;
}

export function AccountNoteCard({ note, onDelete, isDeleting }: AccountNoteCardProps) {
  const { user } = useAuth();
  const isAuthor = user?.id === note.author_id;
  
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const authorName = note.author?.full_name || 'Unknown';
  const highlightedContent = highlightMentions(note.content);
  
  return (
    <div className="group relative rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:border-slate-600/50">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 border border-slate-600">
          <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs">
            {getInitials(note.author?.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">{authorName}</span>
            <span className="text-xs text-slate-500">
              {format(new Date(note.created_at), 'MMM d, yyyy \'at\' h:mm a')}
            </span>
          </div>
          
          <div 
            className="text-slate-300 text-sm whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </div>
        
        {isAuthor && (
          <PlatformButton
            variant="ghost"
            size={tokens.button.inline}
            onClick={() => onDelete(note.id)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </PlatformButton>
        )}
      </div>
    </div>
  );
}
