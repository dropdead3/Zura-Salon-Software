/**
 * INSPECTOR PANEL (Right, 320px Fixed)
 * 
 * Contextual property editor. Shows "Select an element" when nothing
 * is selected, otherwise renders the editor content passed as children.
 */

import { type ReactNode } from 'react';
import { MousePointerClick } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { editorTokens } from '../editor-tokens';
import { PanelSlideIn } from '../EditorMotion';
import { cn } from '@/lib/utils';

interface InspectorPanelProps {
  /** Whether an element is selected (shows editor vs empty state) */
  hasSelection: boolean;
  /** Unique key for the current selection (triggers slide animation) */
  selectionKey?: string;
  /** Editor content to render */
  children: ReactNode;
  className?: string;
}

export function InspectorPanel({
  hasSelection,
  selectionKey,
  children,
  className,
}: InspectorPanelProps) {
  return (
    <div className={cn(editorTokens.panel.inspector, 'h-full flex flex-col', className)}>
      {/* Inspector Header */}
      <div className={cn(editorTokens.panel.header, 'justify-between')}>
        <span className="text-xs font-display tracking-wide text-muted-foreground">
          INSPECTOR
        </span>
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
