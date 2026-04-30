import { useState, useEffect, useRef, useCallback, useLayoutEffect, memo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Monitor, Tablet, Smartphone, Maximize2, RefreshCw, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LivePreviewPanelProps {
  activeSectionId?: string;
  previewUrl?: string;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile' | 'fit';
type Orientation = 'portrait' | 'landscape';

// True viewport sizes — iframe always renders at these widths so the site uses
// its REAL responsive breakpoints. We CSS-scale the result to fit the pane.
const DEVICE_PRESETS: Record<Exclude<DeviceMode, 'fit'>, { w: number; h: number; label: string }> = {
  desktop: { w: 1440, h: 900, label: 'Desktop' },
  tablet: { w: 834, h: 1194, label: 'iPad' },
  mobile: { w: 390, h: 844, label: 'iPhone' },
};

const VIEWPORT_KEY = 'website-editor:device';
const ORIENTATION_KEY = 'website-editor:orientation';

function readDevice(): DeviceMode {
  try {
    const v = localStorage.getItem(VIEWPORT_KEY);
    if (v === 'desktop' || v === 'tablet' || v === 'mobile' || v === 'fit') return v;
  } catch {}
  // Default to 'fit' so the iframe uses the full pane and the site's real
  // responsive breakpoints kick in. Persisted preferences override.
  return 'fit';
}

function readOrientation(): Orientation {
  try {
    const v = localStorage.getItem(ORIENTATION_KEY);
    if (v === 'portrait' || v === 'landscape') return v;
  } catch {}
  return 'portrait';
}

export const LivePreviewPanel = memo(function LivePreviewPanel({ activeSectionId, previewUrl }: LivePreviewPanelProps) {
  const [device, setDeviceState] = useState<DeviceMode>(readDevice);
  const [orientation, setOrientationState] = useState<Orientation>(readOrientation);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [paneSize, setPaneSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Mirror the shell's editor-dirty-state so the toolbar can flip its label
  // from "Live Preview" to "Editing — unsaved" while the user types. This
  // makes the live-edit bridge legible: the canvas is showing your in-progress
  // edits, not what's saved.
  const [isEditingLive, setIsEditingLive] = useState(false);

  useEffect(() => {
    const onDirty = (e: Event) => {
      setIsEditingLive(!!(e as CustomEvent).detail?.dirty);
    };
    window.addEventListener('editor-dirty-state', onDirty);
    return () => window.removeEventListener('editor-dirty-state', onDirty);
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);
  const pendingSectionRef = useRef<string | undefined>(undefined);
  const previewOrigin = previewUrl ? new URL(previewUrl).origin : window.location.origin;

  const setDevice = useCallback((d: DeviceMode) => {
    setDeviceState(d);
    try { localStorage.setItem(VIEWPORT_KEY, d); } catch {}
  }, []);
  const setOrientation = useCallback((o: Orientation) => {
    setOrientationState(o);
    try { localStorage.setItem(ORIENTATION_KEY, o); } catch {}
  }, []);

  // Observe pane size — recompute scale on splitter drag / window resize
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPaneSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sendScrollMessage = useCallback((sectionId: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: 'PREVIEW_SCROLL_TO_SECTION', sectionId, behavior: 'smooth' },
      previewOrigin
    );
    setTimeout(() => {
      iframe.contentWindow?.postMessage(
        { type: 'PREVIEW_HIGHLIGHT_SECTION', sectionId },
        previewOrigin
      );
    }, 400);
  }, [previewOrigin]);

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
    if (pendingSectionRef.current) {
      sendScrollMessage(pendingSectionRef.current);
      pendingSectionRef.current = undefined;
    }
  }, [sendScrollMessage]);

  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
      setIsLoading(true);
      iframeReadyRef.current = false;
    };
    window.addEventListener('website-preview-refresh', handleStorageChange);
    return () => window.removeEventListener('website-preview-refresh', handleStorageChange);
  }, []);

  // ── Editor → iframe bridge ──
  // Forward parent CustomEvents (live design tweaks, provisional reorder during drag)
  // straight into the iframe so the canvas reflows the moment the operator interacts.
  useEffect(() => {
    const post = (msg: any) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(msg, previewOrigin);
    };

    const onDesign = (e: Event) => {
      const overrides = (e as CustomEvent).detail?.overrides ?? null;
      post({ type: 'PREVIEW_DESIGN_OVERRIDES', overrides });
    };
    const onProvisionalOrder = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      post({
        type: 'PREVIEW_PROVISIONAL_ORDER',
        pageId: detail.pageId,
        order: detail.order ?? [],
      });
    };
    const onCommitOrder = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      post({
        type: 'PREVIEW_REORDER_SECTIONS',
        pageId: detail.pageId,
        order: detail.order ?? [],
      });
    };
    // Real-time refresh: any draft write → tell the iframe to invalidate
    // its site-settings query cache so the canvas reflects the change
    // without requiring a full reload.
    const onDraftWrite = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      post({
        type: 'PREVIEW_REFRESH_DRAFT',
        orgId: detail.orgId,
        key: detail.key,
      });
    };

    window.addEventListener('editor-design-preview', onDesign);
    window.addEventListener('editor-provisional-order', onProvisionalOrder);
    window.addEventListener('editor-commit-order', onCommitOrder);
    window.addEventListener('site-settings-draft-write', onDraftWrite);
    return () => {
      window.removeEventListener('editor-design-preview', onDesign);
      window.removeEventListener('editor-provisional-order', onProvisionalOrder);
      window.removeEventListener('editor-commit-order', onCommitOrder);
      window.removeEventListener('site-settings-draft-write', onDraftWrite);
    };
  }, [previewOrigin]);

  const handleRefresh = () => {
    if (!previewUrl) return;
    setRefreshKey(prev => prev + 1);
    setIsLoading(true);
    iframeReadyRef.current = false;
  };

  // ── Compute iframe dimensions and scale ──
  // Reserve a little padding inside the stage so the device doesn't kiss the edges.
  const STAGE_PAD = 24;
  const availW = Math.max(paneSize.w - STAGE_PAD * 2, 0);
  const availH = Math.max(paneSize.h - STAGE_PAD * 2, 0);

  let iframeW: number;
  let iframeH: number;
  let scale: number;

  if (device === 'fit') {
    iframeW = Math.max(availW, 320);
    iframeH = Math.max(availH, 320);
    scale = 1;
  } else {
    const preset = DEVICE_PRESETS[device];
    const portrait = orientation === 'portrait' || device === 'desktop';
    iframeW = portrait ? preset.w : preset.h;
    iframeH = portrait ? preset.h : preset.w;
    if (availW > 0 && availH > 0) {
      scale = Math.min(availW / iframeW, availH / iframeH, 1);
    } else {
      scale = 1;
    }
  }

  const scaledW = iframeW * scale;
  const scaledH = iframeH * scale;
  const scalePct = Math.round(scale * 100);

  const previewMeta = previewUrl
    ? (() => {
        try {
          const url = new URL(previewUrl);
          const isCustomDomain = url.origin !== window.location.origin;
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          // Strip /org/<uuid>/ → just the page slug. Keep /p/<slug>.
          const cleanedPath = url.pathname
            .split('/')
            .filter(Boolean)
            .filter((seg, i, arr) => !(arr[i - 1] === 'org' && UUID_RE.test(seg)))
            .filter((seg) => seg !== 'org')
            .join('/');
          const friendlyPath = cleanedPath ? `/${cleanedPath}` : '/';
          // Sandbox/preview hosts hide the UUID prefix; show a clean label instead.
          const isSandboxHost = /lovable\.app$/.test(url.host) || /^id-preview/.test(url.host);
          const friendlyHost = isSandboxHost ? 'Preview' : url.host;
          const friendlyUrl =
            friendlyPath === '/'
              ? friendlyHost
              : `${friendlyHost}${friendlyPath}`;
          return {
            status: isLoading ? 'Loading' : 'Ready',
            channel: isCustomDomain ? 'Custom domain' : null,
            displayUrl: previewUrl,
            friendlyUrl,
          };
        } catch {
          return { status: isLoading ? 'Loading' : 'Ready', channel: null, displayUrl: previewUrl, friendlyUrl: previewUrl };
        }
      })()
    : { status: 'Resolving', channel: null, displayUrl: null, friendlyUrl: null };

  const handleCopyUrl = async () => {
    if (!previewMeta.displayUrl) return;
    await navigator.clipboard.writeText(previewMeta.displayUrl);
  };

  const showOrientation = device === 'tablet' || device === 'mobile';
  const showDeviceFrame = device === 'tablet' || device === 'mobile';

  return (
    <div className="flex flex-col h-full bg-muted/30 border-l border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 min-w-0">
          {isEditingLive ? (
            <>
              <span
                className="text-sm font-medium shrink-0 text-warning-foreground"
                title="Showing unsaved edits — Save Draft to persist"
              >
                Editing — unsaved
              </span>
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            </>
          ) : (
            <>
              <span className="text-sm font-medium shrink-0">Draft Preview</span>
              <span
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/15 text-warning-foreground border border-warning/30"
                title="This preview shows your unpublished draft. Visitors still see the last published version until you Publish."
              >
                Not live
              </span>
              {isLoading && <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Device segmented control */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
            <DeviceButton active={device === 'desktop'} onClick={() => setDevice('desktop')} title="Desktop (1440px)">
              <Monitor className="h-4 w-4" />
            </DeviceButton>
            <DeviceButton active={device === 'tablet'} onClick={() => setDevice('tablet')} title="Tablet (834px)">
              <Tablet className="h-4 w-4" />
            </DeviceButton>
            <DeviceButton active={device === 'mobile'} onClick={() => setDevice('mobile')} title="Mobile (390px)">
              <Smartphone className="h-4 w-4" />
            </DeviceButton>
            <DeviceButton active={device === 'fit'} onClick={() => setDevice('fit')} title="Fit to pane">
              <Maximize2 className="h-4 w-4" />
            </DeviceButton>
          </div>

          {/* Orientation toggle */}
          {showOrientation && (
            <Button
              variant="ghost"
              size={tokens.button.inline}
              onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
              className="h-7 w-7 p-0"
              title={`Rotate (${orientation})`}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size={tokens.button.inline}
            onClick={handleRefresh}
            className="h-7 w-7 p-0"
            title="Reload preview"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Status + URL strip — single condensed line */}
      <div className="border-b border-border bg-card/60 px-3 py-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-[11px]">
            <span className="font-display uppercase tracking-wide text-muted-foreground shrink-0">
              {previewMeta.status}
            </span>
            {previewMeta.channel && (
              <>
                <span className="opacity-40 shrink-0">•</span>
                <span className="font-display uppercase tracking-wide text-muted-foreground shrink-0">
                  {previewMeta.channel}
                </span>
              </>
            )}
            {previewMeta.friendlyUrl && (
              <>
                <span className="opacity-40 shrink-0">•</span>
                <span className="truncate text-foreground/80" title={previewMeta.displayUrl ?? ''}>
                  {previewMeta.friendlyUrl}
                </span>
              </>
            )}
            {device !== 'fit' && (
              <>
                <span className="opacity-40 shrink-0">•</span>
                <span className="font-display uppercase tracking-wide text-muted-foreground shrink-0">
                  {iframeW}×{iframeH} · {scalePct}%
                </span>
              </>
            )}
          </div>

          {previewMeta.displayUrl && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size={tokens.button.inline} className="h-7 w-7 p-0" onClick={handleCopyUrl} title="Copy preview URL">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size={tokens.button.inline}
                className="h-7 w-7 p-0"
                onClick={() => window.open(previewMeta.displayUrl!, '_blank', 'noopener,noreferrer')}
                title="Open preview in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stage — observed for size, hosts the scaled iframe */}
      <div ref={stageRef} className="flex-1 overflow-hidden bg-[hsl(var(--muted)/0.4)] relative">
        {previewUrl ? (
          paneSize.w > 0 && (
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                width: scaledW,
                height: scaledH,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={cn(
                  'origin-top-left bg-background overflow-hidden',
                  showDeviceFrame ? 'rounded-[2.25rem] border-[10px] border-foreground/80 shadow-2xl' : 'rounded-lg border border-border shadow-xl',
                )}
                style={{
                  width: iframeW,
                  height: iframeH,
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  ref={iframeRef}
                  key={refreshKey}
                  src={previewUrl}
                  className="w-full h-full border-0 block bg-background"
                  title="Website Preview"
                  onLoad={handleIframeLoad}
                />
              </div>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Waiting for organization preview URL…
          </div>
        )}
      </div>
    </div>
  );
});

function DeviceButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size={tokens.button.inline}
      className={cn('h-7 w-8 p-0', active && 'bg-background shadow-sm text-foreground')}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

// Helper to trigger preview refresh from anywhere
export function triggerPreviewRefresh() {
  window.dispatchEvent(new CustomEvent('website-preview-refresh'));
}
