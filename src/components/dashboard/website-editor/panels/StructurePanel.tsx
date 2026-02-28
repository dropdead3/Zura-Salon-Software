/**
 * STRUCTURE PANEL (Left, responsive width)
 * 
 * Three-tab segmented control: Pages / Layers / Navigation.
 * Supports collapsed icon-rail state for compact viewports.
 */

import { type ReactNode } from 'react';
import { FileText, Layers, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { editorTokens } from '../editor-tokens';
import { ContentFade } from '../EditorMotion';
import { WebsiteEditorSearch } from '../WebsiteEditorSearch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type StructureMode = 'pages' | 'layers' | 'navigation';

interface StructurePanelProps {
  mode: StructureMode;
  onModeChange: (mode: StructureMode) => void;
  onSearchSelect: (tab: string) => void;
  children: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  style?: React.CSSProperties;
}

const TABS: { mode: StructureMode; label: string; icon: typeof FileText }[] = [
  { mode: 'pages', label: 'Pages', icon: FileText },
  { mode: 'layers', label: 'Sections', icon: Layers },
  { mode: 'navigation', label: 'Nav', icon: Navigation },
];

export function StructurePanel({
  mode,
  onModeChange,
  onSearchSelect,
  children,
  isCollapsed = false,
  onToggleCollapse,
  style,
}: StructurePanelProps) {
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
                <ChevronRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand Structure</TooltipContent>
          </Tooltip>
        )}
        <div className="w-full border-t border-border/30 my-1" />
        {TABS.map(({ mode: tabMode, label, icon: Icon }) => (
          <Tooltip key={tabMode}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  onModeChange(tabMode);
                  onToggleCollapse?.();
                }}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150',
                  mode === tabMode
                    ? 'text-foreground bg-muted/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  // ─── Expanded Panel ───
  return (
    <div className={cn(editorTokens.panel.structure, 'h-full flex flex-col')} style={style}>
      {/* Header with collapse */}
      <div className="px-3 pt-3 pb-2 border-b border-border/40 space-y-2">
        <div className="flex items-center gap-1">
          <div className={cn(editorTokens.segmented.container, 'flex-1')}>
            {TABS.map(({ mode: tabMode, label, icon: Icon }) => (
              <button
                key={tabMode}
                onClick={() => onModeChange(tabMode)}
                className={cn(
                  editorTokens.segmented.button,
                  'flex items-center justify-center gap-1.5',
                  mode === tabMode && editorTokens.segmented.active
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 flex-shrink-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Collapse Panel</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Search */}
        <WebsiteEditorSearch onSelectResult={onSearchSelect} />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <ContentFade motionKey={mode} className="h-full">
          {children}
        </ContentFade>
      </div>
    </div>
  );
}
