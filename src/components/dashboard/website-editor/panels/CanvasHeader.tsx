/**
 * CANVAS HEADER
 * 
 * Top control strip for the Canvas panel.
 * Left: site name + draft indicator + auto-save
 * Center: Desktop / Tablet / Mobile segmented toggle
 * Right: Undo, Redo, Preview, Save, Publish
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  ExternalLink,
  Save,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { editorTokens } from '../editor-tokens';
import { SavedIndicator } from '../EditorMotion';
import { PublishChangesButton } from '../PublishChangelog';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface CanvasHeaderProps {
  siteName?: string;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPreview: () => void;
}

export function CanvasHeader({
  siteName = 'Website',
  isDirty,
  isSaving,
  canUndo,
  canRedo,
  viewportMode,
  onViewportChange,
  onUndo,
  onRedo,
  onSave,
  onPreview,
}: CanvasHeaderProps) {
  // Auto-save "Saved" indicator
  const [showSaved, setShowSaved] = useState(false);
  const wasSaving = useWasSaving(isSaving);

  useEffect(() => {
    if (wasSaving && !isSaving) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [wasSaving, isSaving]);

  const viewports: { mode: ViewportMode; icon: typeof Monitor; label: string }[] = [
    { mode: 'desktop', icon: Monitor, label: 'Desktop' },
    { mode: 'tablet', icon: Tablet, label: 'Tablet' },
    { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className={editorTokens.canvas.controlStrip}>
      {/* Left: Site name + status */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <span className="text-sm font-sans font-medium truncate">{siteName}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            isDirty ? 'bg-amber-500' : 'bg-emerald-500'
          )} />
          <span className="text-[11px] text-muted-foreground font-sans">
            {isDirty ? 'Draft' : 'Published'}
          </span>
          <SavedIndicator visible={showSaved} />
        </div>
      </div>

      {/* Center: Viewport toggle */}
      <div className={editorTokens.segmented.container}>
        {viewports.map(({ mode, icon: Icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewportChange(mode)}
                className={cn(
                  editorTokens.segmented.button,
                  'px-2 flex-initial',
                  viewportMode === mode && editorTokens.segmented.active
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>

        <Button variant="outline" size="sm" className="h-8 px-3" onClick={onPreview}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Preview</span>
        </Button>

        {isDirty && (
          <Button size="sm" className="h-8 px-3" onClick={onSave} disabled={isSaving}>
            {isSaving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save
          </Button>
        )}

        <PublishChangesButton />
      </div>
    </div>
  );
}

/** Track previous saving state to detect save completion */
function useWasSaving(isSaving: boolean) {
  const [wasSaving, setWasSaving] = useState(false);
  useEffect(() => {
    if (isSaving) setWasSaving(true);
    else if (!isSaving && wasSaving) {
      // Keep wasSaving true for one render so the effect above can detect the transition
      const timer = setTimeout(() => setWasSaving(false), 50);
      return () => clearTimeout(timer);
    }
  }, [isSaving, wasSaving]);
  return wasSaving;
}
