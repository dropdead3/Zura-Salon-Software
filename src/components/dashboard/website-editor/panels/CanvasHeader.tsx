/**
 * CANVAS HEADER
 * 
 * Top control strip for the Canvas panel.
 * Left: site name + draft indicator + auto-save
 * Center: Desktop / Tablet / Mobile + Zoom controls
 * Right: Undo, Redo, Preview, Save, Publish
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  ExternalLink,
  Save,
  Loader2,
  Pencil,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { editorTokens } from '../editor-tokens';
import { SavedIndicator } from '../EditorMotion';
import { PublishChangesButton } from '../PublishChangelog';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type ZoomLevel = 'fit' | '100' | '75';
export type CanvasMode = 'edit' | 'view';

interface CanvasHeaderProps {
  siteName?: string;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  viewportMode: ViewportMode;
  zoomLevel: ZoomLevel;
  canvasMode: CanvasMode;
  onViewportChange: (mode: ViewportMode) => void;
  onZoomChange: (zoom: ZoomLevel) => void;
  onCanvasModeChange: (mode: CanvasMode) => void;
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
  zoomLevel,
  canvasMode,
  onViewportChange,
  onZoomChange,
  onCanvasModeChange,
  onUndo,
  onRedo,
  onSave,
  onPreview,
}: CanvasHeaderProps) {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();

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

  // Escape key → navigate back
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable ||
          target.closest('[role="dialog"]'))
      ) return;
      e.preventDefault();
      navigate(dashPath('/'));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const viewports: { mode: ViewportMode; icon: typeof Monitor; label: string }[] = [
    { mode: 'desktop', icon: Monitor, label: 'Desktop' },
    { mode: 'tablet', icon: Tablet, label: 'Tablet' },
    { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  const zoomOptions: { level: ZoomLevel; label: string }[] = [
    { level: 'fit', label: 'Fit' },
    { level: '100', label: '100%' },
    { level: '75', label: '75%' },
  ];

  return (
    <div className={editorTokens.canvas.controlStrip}>
      {/* Left: Back + Site name + status */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => navigate(dashPath('/'))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to Command Center (Esc)</TooltipContent>
        </Tooltip>
        <div className="border-r border-border/40 h-5 flex-shrink-0" />
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

      {/* Center: Canvas Mode + Viewport + Zoom */}
      <div className="flex items-center gap-2">
        {/* Edit / Preview mode toggle */}
        <div className={editorTokens.segmented.container}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onCanvasModeChange('edit')}
                className={cn(
                  editorTokens.segmented.button,
                  'inline-flex items-center gap-1.5 px-2.5',
                  canvasMode === 'edit' && editorTokens.segmented.active
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Edit mode — section cards &amp; controls</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onCanvasModeChange('view')}
                className={cn(
                  editorTokens.segmented.button,
                  'inline-flex items-center gap-1.5 px-2.5',
                  canvasMode === 'view' && editorTokens.segmented.active
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Preview mode — exact public site</TooltipContent>
          </Tooltip>
        </div>

        <div className="border-r border-border/40 h-5 flex-shrink-0" />

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

        {/* Zoom controls */}
        <div className={cn(editorTokens.segmented.container, 'hidden sm:flex')}>
          {zoomOptions.map(({ level, label }) => (
            <button
              key={level}
              onClick={() => onZoomChange(level)}
              className={cn(
                editorTokens.segmented.button,
                'px-2 flex-initial text-[10px]',
                zoomLevel === level && editorTokens.segmented.active
              )}
            >
              {label}
            </button>
          ))}
        </div>
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
      const timer = setTimeout(() => setWasSaving(false), 50);
      return () => clearTimeout(timer);
    }
  }, [isSaving, wasSaving]);
  return wasSaving;
}
