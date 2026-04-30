/**
 * Editor → Preview live-edit bridge.
 *
 * Doctrine:
 *   - The Website Editor canvas is an iframe of the real public site
 *     (`/org/<slug>/<page>?preview=true`). Without this bridge the iframe only
 *     ever shows the *last-saved* state; in-progress, unsaved edits don't
 *     appear until Save Draft.
 *   - This bridge fixes that by broadcasting the editor's in-memory value to
 *     the iframe via `postMessage`. The iframe merges the override into local
 *     state ONLY when running in `?preview=true` mode AND the message orgId
 *     matches the current org context. Visitors of the live public site are
 *     never affected.
 *
 * Two hooks, one file:
 *   - `usePreviewBridge(sectionKey, value, orgId)` — call inside the editor
 *     component. Posts the value to the iframe on every change (debounced).
 *   - `useLiveOverride(sectionKey, dbValue)` — call inside the public-site
 *     consumer hook. Returns dbValue normally; returns the live override when
 *     running inside a preview iframe and a matching message has arrived.
 *
 * Security:
 *   - Editor → iframe: posts to `iframeRef.current.contentWindow` with the
 *     iframe's resolved origin (never `'*'`).
 *   - Iframe → editor: drops messages whose `event.origin !== window.origin`
 *     (sandbox + custom-domain previews are same-origin in our setup).
 *   - Tenant isolation: every message carries `orgId`; the iframe drops
 *     messages whose `orgId` doesn't match the current `OrganizationContext`.
 *   - Preview-mode gate: `useLiveOverride` is a no-op outside `?preview=true`.
 *
 * The bridge never persists. Refresh = back to DB state. Save Draft / Publish
 * doctrine is preserved end-to-end.
 */
import { useEffect, useRef, useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

type LiveUpdate<T = unknown> = {
  type: 'EDITOR_LIVE_UPDATE';
  sectionKey: string;
  value: T;
  orgId: string;
};

type LiveClear = {
  type: 'EDITOR_LIVE_CLEAR';
  sectionKey: string;
  orgId: string;
};

type BridgeMessage<T = unknown> = LiveUpdate<T> | LiveClear;

const DEBOUNCE_MS = 120;

/**
 * Find the preview iframe rendered by `LivePreviewPanel`. Scoped lookup —
 * we don't broadcast to arbitrary iframes.
 */
function findPreviewIframe(): HTMLIFrameElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLIFrameElement>('iframe[title="Website Preview"]');
}

/**
 * EDITOR side. Call inside any section editor with the in-memory value.
 * Sends a debounced `EDITOR_LIVE_UPDATE` to the preview iframe.
 *
 * Pass `null` (or omit) the orgId and we'll pull it from OrganizationContext;
 * passing it explicitly is preferred when the editor already has it.
 */
export function usePreviewBridge<T>(sectionKey: string, value: T) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!orgId) return;

    const handle = window.setTimeout(() => {
      const iframe = findPreviewIframe();
      const win = iframe?.contentWindow;
      if (!win) return;

      let targetOrigin: string;
      try {
        targetOrigin = iframe!.src ? new URL(iframe!.src).origin : window.location.origin;
      } catch {
        targetOrigin = window.location.origin;
      }

      const msg: LiveUpdate<T> = {
        type: 'EDITOR_LIVE_UPDATE',
        sectionKey,
        value: valueRef.current,
        orgId,
      };
      try {
        win.postMessage(msg, targetOrigin);
      } catch {
        // Cross-origin denial or iframe gone — silently ignore. Worst case the
        // canvas just keeps showing last-saved state, which is current behavior.
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [sectionKey, value, orgId]);
}

/**
 * Send a one-shot CLEAR — call from the editor after a successful save so the
 * iframe drops its in-memory override and re-renders from the freshly
 * invalidated DB query (TanStack already invalidates inside `useSectionConfig`).
 */
export function clearPreviewOverride(sectionKey: string, orgId: string | null) {
  if (!orgId) return;
  const iframe = findPreviewIframe();
  const win = iframe?.contentWindow;
  if (!win) return;
  let targetOrigin: string;
  try {
    targetOrigin = iframe!.src ? new URL(iframe!.src).origin : window.location.origin;
  } catch {
    targetOrigin = window.location.origin;
  }
  const msg: LiveClear = {
    type: 'EDITOR_LIVE_CLEAR',
    sectionKey,
    orgId,
  };
  try {
    win.postMessage(msg, targetOrigin);
  } catch {
    /* noop */
  }
}

/**
 * IFRAME side. Call inside any public-site config consumer.
 * Returns `dbValue` unless:
 *   - we're running inside the editor preview (`?preview=true` or `?mode=…`)
 *   - AND the parent posted a matching `EDITOR_LIVE_UPDATE` for this sectionKey
 *   - AND the message orgId matches the current OrganizationContext
 *
 * On the live public site this hook is effectively a pass-through.
 */
export function useLiveOverride<T>(sectionKey: string, dbValue: T | undefined): T | undefined {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;
  const [override, setOverride] = useState<T | null>(null);

  // Detect preview mode at mount. Stable for the lifetime of this iframe.
  const isPreview = (() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('preview') || params.has('mode');
  })();

  useEffect(() => {
    if (!isPreview) return;
    if (!orgId) return;

    const handler = (event: MessageEvent<BridgeMessage<T>>) => {
      // Origin pin — same-origin only. Sandbox & custom-domain previews are
      // always same-origin in our setup.
      if (event.origin !== window.location.origin) return;

      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.sectionKey !== sectionKey) return;
      if (msg.orgId !== orgId) return; // tenant isolation

      if (msg.type === 'EDITOR_LIVE_UPDATE') {
        setOverride(msg.value as T);
      } else if (msg.type === 'EDITOR_LIVE_CLEAR') {
        setOverride(null);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isPreview, orgId, sectionKey]);

  if (!isPreview) return dbValue;
  return override ?? dbValue;
}
