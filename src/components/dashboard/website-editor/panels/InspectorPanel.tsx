/**
 * INSPECTOR PANEL (Right, responsive width)
 * 
 * Contextual property editor. Shows "Select an element" when nothing
 * is selected. Supports collapsed icon-rail state.
 */

import { type ReactNode } from 'react';
import { MousePointerClick, ChevronRight, ChevronLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { editorTokens } from '../editor-tokens';
import { PanelSlideIn } from '../EditorMotion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InspectorPanelProps {
  hasSelection: boolean;
  selectionKey?: string;
  breadcrumb?: string[];
  children: ReactNode;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  style?: React.CSSProperties;
}

export function InspectorPanel({
  hasSelection,
  selectionKey,
  breadcrumb,
  children,
  className,
  isCollapsed = false,
  onToggleCollapse,
  style,
}: InspectorPanelProps) {
  // ─── Collapsed Icon Rail ───
  if (isCollapsed) {
    return (
      <div className={editorTokens.panel.collapsedRail} style={style}>
        {onToggleCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Expand Inspector</TooltipContent>
          </Tooltip>
        )}
        <div className="w-full border-t border-border/20 my-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCollapse}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
            >
              <MousePointerClick className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Inspector</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // ─── Expanded Panel ───
  return (
    <div className={cn(editorTokens.panel.inspector, 'h-full flex flex-col overflow-hidden', className)} style={style}>
      {/* Inspector Header */}
      <div className={cn(editorTokens.panel.header, 'justify-between')}>
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-1 min-w-0 overflow-hidden flex-1">
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
          <span className="text-xs font-display tracking-wide text-muted-foreground flex-1">
            INSPECTOR
          </span>
        )}
        {onToggleCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 flex-shrink-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Collapse Panel</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Content */}
      {hasSelection ? (
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="w-full min-w-0 overflow-x-hidden">
            <PanelSlideIn motionKey={selectionKey} className={editorTokens.inspector.content}>
              {children}
            </PanelSlideIn>
          </div>
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
