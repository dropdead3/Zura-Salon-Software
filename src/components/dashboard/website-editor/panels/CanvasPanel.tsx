/**
 * CANVAS PANEL (Center, Flexible)
 * 
 * Full-bleed live preview iframe with header controls.
 * Desktop preview constrained to max-w-[1280px] with zoom controls.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { editorTokens } from '../editor-tokens';
import { CanvasHeader, type ViewportMode, type ZoomLevel, type CanvasMode } from './CanvasHeader';

interface CanvasPanelProps {
  activeSectionId?: string;
  scrollTrigger?: number;
  previewUrl?: string;
  siteName?: string;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPreview: () => void;
}

const VIEWPORT_WIDTHS: Record<ViewportMode, string> = {
  desktop: 'w-full', // no max-w constraint — scaled instead
  tablet: 'max-w-[834px]',
  mobile: 'max-w-[390px]',
};

const ZOOM_SCALES: Record<ZoomLevel, number> = {
  fit: 1,
  '100': 1,
  '75': 0.75,
};

const DESKTOP_WIDTH = 1440;

export const CanvasPanel = memo(function CanvasPanel({
  activeSectionId,
  scrollTrigger,
  previewUrl,
  siteName,
  isDirty,
  isSaving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onPreview,
}: CanvasPanelProps) {
  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => {
    return (localStorage.getItem('editor-viewport') as ViewportMode) || 'desktop';
  });
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('fit');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(() => (localStorage.getItem('editor-canvas-mode') as CanvasMode) || 'edit');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const loadStartRef = useRef(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const iframeReadyRef = useRef(false);
  const pendingSectionRef = useRef<string | undefined>(undefined);

  const handleCanvasModeChange = useCallback((mode: CanvasMode) => {
    setCanvasMode(mode);
    localStorage.setItem('editor-canvas-mode', mode);
    // Refresh iframe when switching modes so it re-renders with the new param
    setRefreshKey(prev => prev + 1);
    setIsLoading(true);
    loadStartRef.current = Date.now();
    iframeReadyRef.current = false;
  }, []);

  const handleViewportChange = useCallback((mode: ViewportMode) => {
    setViewportMode(mode);
    localStorage.setItem('editor-viewport', mode);
  }, []);

  const sendScrollMessage = useCallback((sectionId: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const origin = previewUrl ? new URL(previewUrl).origin : window.location.origin;
    iframe.contentWindow.postMessage(
      { type: 'PREVIEW_SCROLL_TO_SECTION', sectionId, behavior: 'smooth' },
      origin
    );
    setTimeout(() => {
      iframe.contentWindow?.postMessage(
        { type: 'PREVIEW_HIGHLIGHT_SECTION', sectionId },
        origin
      );
    }, 400);
  }, [previewUrl]);

  useEffect(() => {
    if (!activeSectionId) return;
    if (iframeReadyRef.current) {
      sendScrollMessage(activeSectionId);
    } else {
      pendingSectionRef.current = activeSectionId;
    }
  }, [activeSectionId, scrollTrigger, sendScrollMessage]);

  const handleIframeLoad = useCallback(() => {
    const MIN_DISPLAY_MS = 400;
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => setIsLoading(false), remaining);
  }, []);

  // Listen for PREVIEW_READY from iframe content (PageSectionRenderer)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === 'PREVIEW_READY') {
        iframeReadyRef.current = true;
        if (pendingSectionRef.current) {
          sendScrollMessage(pendingSectionRef.current);
          pendingSectionRef.current = undefined;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sendScrollMessage]);

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
      setIsLoading(true);
      loadStartRef.current = Date.now();
      iframeReadyRef.current = false;
    };
    window.addEventListener('website-preview-refresh', handleRefresh);
    return () => window.removeEventListener('website-preview-refresh', handleRefresh);
  }, []);

  // Measure container for desktop scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isDesktop = viewportMode === 'desktop';
  const effectiveWidth = isDesktop ? Math.max(DESKTOP_WIDTH, containerSize.w) : DESKTOP_WIDTH;
  const fitScale = isDesktop && containerSize.w > 0
    ? Math.min((containerSize.w + 2) / effectiveWidth, 1)
    : 1;
  const effectiveScale = isDesktop
    ? fitScale * (zoomLevel === '75' ? 0.75 : 1)
    : ZOOM_SCALES[zoomLevel];

  return (
    <div className={cn(editorTokens.panel.canvas, 'h-full flex flex-col relative rounded-none')}>
      {/* Canvas Header */}
      <CanvasHeader
        siteName={siteName}
        isDirty={isDirty}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        viewportMode={viewportMode}
        zoomLevel={zoomLevel}
        canvasMode={canvasMode}
        onViewportChange={handleViewportChange}
        onZoomChange={setZoomLevel}
        onCanvasModeChange={handleCanvasModeChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onSave={onSave}
        onPreview={onPreview}
      />

      {/* Canvas Surface */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative" style={{ backgroundColor: 'hsl(36, 39%, 93%)' }}>
        <div
          className={cn(
            'h-full',
            !isDesktop && 'transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
            !isDesktop && VIEWPORT_WIDTHS[viewportMode],
            isDesktop ? 'overflow-hidden bg-background' : editorTokens.canvas.previewFrame,
            !isDesktop && 'mx-auto'
          )}
          style={{
            ...(isDesktop
              ? {
                  width: `${effectiveWidth}px`,
                  height: containerSize.h > 0 ? `${containerSize.h / effectiveScale}px` : '100%',
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top left',
                }
              : {
                  transform: effectiveScale !== 1 ? `scale(${effectiveScale})` : undefined,
                  transformOrigin: 'top center',
                }),
          }}
        >
          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={(() => {
              const base = previewUrl || '/?preview=true';
              const separator = base.includes('?') ? '&' : '?';
              return `${base}${separator}mode=${canvasMode}`;
            })()}
            className="w-full h-full border-0"
            title="Website Preview"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <DashboardLoader className="min-h-0" />
        </div>
      )}
    </div>
  );
});
