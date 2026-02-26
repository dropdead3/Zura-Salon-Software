import { ReactNode, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Copy, Eye, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditorSectionCardProps {
  sectionId: string;
  label: string;
  enabled: boolean;
  children: ReactNode;
}

export function EditorSectionCard({
  sectionId,
  label,
  enabled,
  children,
}: EditorSectionCardProps) {
  const [isSelected, setIsSelected] = useState(false);

  // Listen for highlight messages from parent editor
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'PREVIEW_HIGHLIGHT_SECTION') {
        setIsSelected(msg.sectionId === sectionId);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sectionId]);

  const handleClick = useCallback(() => {
    window.parent.postMessage({ type: 'EDITOR_SELECT_SECTION', sectionId }, '*');
  }, [sectionId]);

  const sendAction = useCallback((type: string, extra?: Record<string, unknown>) => {
    window.parent.postMessage({ type, sectionId, ...extra }, '*');
  }, [sectionId]);

  return (
    <div
      className={cn(
        'group relative rounded-[20px] border bg-card/90 transition-shadow duration-200',
        'shadow-[0_2px_12px_-4px_hsl(0_0%_0%/0.08)]',
        'border-border/30',
        'p-6 sm:p-7 lg:p-8',
        isSelected && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background',
        !enabled && 'opacity-50',
      )}
      onClick={handleClick}
    >
      {/* Hover header */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 pointer-events-none group-hover:pointer-events-auto">
        <span className="font-sans text-[11px] text-muted-foreground truncate max-w-[50%]">
          {label}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-grab"
            title="Drag to reorder"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Duplicate"
            onClick={(e) => { e.stopPropagation(); sendAction('EDITOR_DUPLICATE_SECTION'); }}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            title={enabled ? 'Hide section' : 'Show section'}
            onClick={(e) => { e.stopPropagation(); sendAction('EDITOR_TOGGLE_SECTION', { enabled: !enabled }); }}
          >
            {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => sendAction('EDITOR_DELETE_SECTION')}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {children}
    </div>
  );
}
