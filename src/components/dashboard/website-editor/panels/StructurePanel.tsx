/**
 * STRUCTURE PANEL (Left, 280px Fixed)
 * 
 * Three-tab segmented control: Pages / Layers / Navigation.
 * Structure only — no settings controls.
 */

import { type ReactNode } from 'react';
import { FileText, Layers, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { editorTokens } from '../editor-tokens';
import { ContentFade } from '../EditorMotion';
import { WebsiteEditorSearch } from '../WebsiteEditorSearch';

export type StructureMode = 'pages' | 'layers' | 'navigation';

interface StructurePanelProps {
  mode: StructureMode;
  onModeChange: (mode: StructureMode) => void;
  onSearchSelect: (tab: string) => void;
  children: ReactNode;
}

const TABS: { mode: StructureMode; label: string; icon: typeof FileText }[] = [
  { mode: 'pages', label: 'Pages', icon: FileText },
  { mode: 'layers', label: 'Layers', icon: Layers },
  { mode: 'navigation', label: 'Nav', icon: Navigation },
];

export function StructurePanel({
  mode,
  onModeChange,
  onSearchSelect,
  children,
}: StructurePanelProps) {
  return (
    <div className={cn(editorTokens.panel.structure, 'h-full flex flex-col')}>
      {/* Segmented Control */}
      <div className="px-3 pt-3 pb-2 border-b border-border/30 space-y-2">
        <div className={editorTokens.segmented.container}>
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
