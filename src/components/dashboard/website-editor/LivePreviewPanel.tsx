import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Monitor, Smartphone, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LivePreviewPanelProps {
  activeSectionId?: string;
  previewUrl?: string;
}

export const LivePreviewPanel = memo(function LivePreviewPanel({ activeSectionId, previewUrl }: LivePreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    return (localStorage.getItem('preview-viewport') as 'desktop' | 'mobile') || 'desktop';
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);
  const pendingSectionRef = useRef<string | undefined>(undefined);

  const sendScrollMessage = useCallback((sectionId: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const origin = window.location.origin;
    iframe.contentWindow.postMessage(
      { type: 'PREVIEW_SCROLL_TO_SECTION', sectionId, behavior: 'smooth' },
      origin
    );
    // Small delay then highlight
    setTimeout(() => {
      iframe.contentWindow?.postMessage(
        { type: 'PREVIEW_HIGHLIGHT_SECTION', sectionId },
        origin
      );
    }, 400);
  }, []);

  // When activeSectionId changes, scroll (or queue if not ready)
  useEffect(() => {
    if (!activeSectionId) return;
    if (iframeReadyRef.current) {
      sendScrollMessage(activeSectionId);
    } else {
      pendingSectionRef.current = activeSectionId;
    }
  }, [activeSectionId, sendScrollMessage]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    iframeReadyRef.current = true;
    // Flush pending scroll
    if (pendingSectionRef.current) {
      sendScrollMessage(pendingSectionRef.current);
      pendingSectionRef.current = undefined;
    }
  }, [sendScrollMessage]);

  // Auto-refresh on data saves
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
      setIsLoading(true);
      iframeReadyRef.current = false;
    };

    window.addEventListener('website-preview-refresh', handleStorageChange);
    return () => {
      window.removeEventListener('website-preview-refresh', handleStorageChange);
    };
  }, []);

  const handleRefresh = () => {
    if (!previewUrl) return;
    setRefreshKey(prev => prev + 1);
    setIsLoading(true);
    iframeReadyRef.current = false;
  };

  const previewMeta = previewUrl
    ? (() => {
        try {
          const url = new URL(previewUrl);
          const isCustomDomain = url.origin !== window.location.origin;
          return {
            status: isLoading ? 'Loading preview' : 'Preview ready',
            channel: isCustomDomain ? 'Custom domain' : 'Org route',
            displayUrl: previewUrl,
          };
        } catch {
          return {
            status: isLoading ? 'Loading preview' : 'Preview ready',
            channel: 'Org route',
            displayUrl: previewUrl,
          };
        }
      })()
    : {
        status: 'Resolving preview URL',
        channel: 'Waiting for org context',
        displayUrl: null,
      };

  const handleCopyUrl = async () => {
    if (!previewMeta.displayUrl) return;
    await navigator.clipboard.writeText(previewMeta.displayUrl);
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-l border-border">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Live Preview</span>
          {isLoading && (
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Device Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size={tokens.button.inline}
              className={cn(
                "h-7 px-2",
                viewMode === 'desktop' && "bg-background shadow-sm"
              )}
              onClick={() => { setViewMode('desktop'); localStorage.setItem('preview-viewport', 'desktop'); }}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size={tokens.button.inline}
              className={cn(
                "h-7 px-2",
                viewMode === 'mobile' && "bg-background shadow-sm"
              )}
              onClick={() => { setViewMode('mobile'); localStorage.setItem('preview-viewport', 'mobile'); }}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size={tokens.button.inline}
            onClick={handleRefresh}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

        </div>
      </div>

      <div className="border-b border-border bg-card/60 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-display uppercase tracking-wide text-muted-foreground">
              <span>{previewMeta.status}</span>
              <span className="opacity-40">•</span>
              <span>{previewMeta.channel}</span>
            </div>
            <p className="truncate text-xs text-foreground/80" title={previewMeta.displayUrl ?? previewMeta.status}>
              {previewMeta.displayUrl ?? 'Waiting for organization public URL...'}
            </p>
          </div>

          {previewMeta.displayUrl && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size={tokens.button.inline}
                className="h-7 w-7 p-0"
                onClick={handleCopyUrl}
                title="Copy preview URL"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size={tokens.button.inline}
                className="h-7 w-7 p-0"
                onClick={() => window.open(previewMeta.displayUrl!, '_blank', 'noopener,noreferrer')}
                title="Open preview URL"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-hidden">
        <div 
          className={cn(
            "mx-auto h-full bg-background",
            viewMode === 'mobile' ? "max-w-[390px] my-4 rounded-lg overflow-hidden border border-border shadow-lg" : "w-full"
          )}
        >
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              key={refreshKey}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Website Preview"
              onLoad={handleIframeLoad}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Waiting for organization preview URL…
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Helper function to trigger preview refresh from anywhere
export function triggerPreviewRefresh() {
  window.dispatchEvent(new CustomEvent('website-preview-refresh'));
}
