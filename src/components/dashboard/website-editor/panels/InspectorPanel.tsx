/**
 * INSPECTOR PANEL (Right, 320px Fixed)
 * 
 * Contextual property editor. Shows "Select an element" when nothing
 * is selected, otherwise renders the editor content passed as children.
 */

import { type ReactNode } from 'react';
import { MousePointerClick, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { editorTokens } from '../editor-tokens';
import { PanelSlideIn } from '../EditorMotion';
import { cn } from '@/lib/utils';

interface InspectorPanelProps {
  /** Whether an element is selected (shows editor vs empty state) */
  hasSelection: boolean;
  /** Unique key for the current selection (triggers slide animation) */
  selectionKey?: string;
  /** Breadcrumb segments for context (e.g., ["Services Page", "Content Block"]) */
  breadcrumb?: string[];
  /** Editor content to render */
  children: ReactNode;
  className?: string;
}

export function InspectorPanel({
  hasSelection,
  selectionKey,
  breadcrumb,
  children,
  className,
}: InspectorPanelProps) {
  return (
    <div className={cn(editorTokens.panel.inspector, 'h-full flex flex-col', className)}>
      {/* Inspector Header */}
      <div className={cn(editorTokens.panel.header, 'justify-between')}>
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {breadcrumb.map((segment, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />}
                <span className={cn(
                  'text-xs font-sans truncate',
                  i === breadcrumb.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}>
                  {segment}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs font-display tracking-wide text-muted-foreground">
            INSPECTOR
          </span>
        )}
      </div>

      {/* Content */}
      {hasSelection ? (
        <ScrollArea className="flex-1">
          <PanelSlideIn motionKey={selectionKey} className={editorTokens.inspector.content}>
            {children}
          </PanelSlideIn>
        </ScrollArea>
      ) : (
        <div className={editorTokens.inspector.empty}>
          <MousePointerClick className={editorTokens.inspector.emptyIcon} />
          <p className={editorTokens.inspector.emptyText}>
            Select an element to edit
          </p>
        </div>
      )}
    </div>
  );
}
