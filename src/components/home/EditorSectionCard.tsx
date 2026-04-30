/**
 * EDITOR SECTION CARD
 * 
 * Floating bento card wrapper for sections in the editor canvas preview.
 * Only renders when ?preview=true is in the URL (editor mode).
 * Does NOT affect public-facing site rendering.
 */

import { useState, useCallback, type ReactNode } from 'react';
import { GripVertical, Copy, Eye, EyeOff, MoreHorizontal, Trash2, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorSectionCardProps {
  sectionId: string;
  sectionLabel: string;
  enabled: boolean;
  isSelected: boolean;
  fullBleed?: boolean;
  children: ReactNode;
}

export function EditorSectionCard({
  sectionId,
  sectionLabel,
  enabled,
  isSelected,
  fullBleed = false,
  children,
}: EditorSectionCardProps) {
  const [showOverflow, setShowOverflow] = useState(false);

  const sendMessage = useCallback((type: string, payload?: Record<string, unknown>) => {
    window.parent.postMessage({ type, sectionId, ...payload }, window.location.origin);
  }, [sectionId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't select if clicking controls
    if ((e.target as HTMLElement).closest('[data-editor-control]')) return;
    sendMessage('EDITOR_SELECT_SECTION');
  }, [sendMessage]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage('EDITOR_TOGGLE_SECTION', { enabled: !enabled });
  }, [sendMessage, enabled]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage('EDITOR_DUPLICATE_SECTION');
  }, [sendMessage]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOverflow(false);
    sendMessage('EDITOR_DELETE_SECTION');
  }, [sendMessage]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative transition-all duration-200',
        'cursor-pointer',
        isSelected && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background',
        !enabled && 'opacity-50'
      )}
    >
      {/* Hover header row */}
      <div
        data-editor-control
        className={cn(
          'absolute top-3 left-4 right-4 flex items-center justify-between',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          'pointer-events-none group-hover:pointer-events-auto',
          'z-10'
        )}
      >
        {/* Section name */}
        <span className="text-[11px] font-sans text-muted-foreground/70 truncate max-w-[50%]">
          {sectionLabel}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <button
            data-editor-control
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-grab"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            data-editor-control
            onClick={handleDuplicate}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            data-editor-control
            onClick={handleToggle}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            title={enabled ? 'Hide section' : 'Show section'}
          >
            {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <div className="relative">
            <button
              data-editor-control
              onClick={(e) => { e.stopPropagation(); setShowOverflow(prev => !prev); }}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
              title="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showOverflow && (
              <div
                data-editor-control
                className="absolute right-0 top-7 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-20"
              >
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-1.5 text-xs font-sans text-destructive hover:bg-destructive/10 text-left flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div className={cn(!enabled && 'pointer-events-none')}>
        {children}
      </div>
    </div>
  );
}
