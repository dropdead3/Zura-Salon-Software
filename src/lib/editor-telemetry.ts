/**
 * Editor save-state telemetry — dev-only doctrine for surfacing post-save
 * refetch races across every website editor.
 *
 * Why this exists
 * ───────────────
 * The "promo popup snap-back" regression (May 2026) was a multi-step race:
 *   1. operator clicks Save
 *   2. mutation success fires → query invalidates
 *   3. refetch lands with stale/null payload
 *   4. form re-hydrates and clobbers in-flight edits
 *
 * Each step looked correct in isolation; only the *sequence* was wrong.
 * Wiring telemetry at each checkpoint produces a single grouped log per
 * save attempt so the order of events (and the form snapshot at each
 * point) is obvious in DevTools without an extra debugger.
 *
 * Doctrine: `useSaveTelemetry(scope)` is the canonical hook. Any editor
 * that wires it gets save-trace coverage automatically because shared
 * infrastructure (`triggerPreviewRefresh`, `writeSiteSettingDraft`)
 * emits events into the active ambient trace. Editors only need to log
 * scope-specific checkpoints (save click, snapshot, etc.).
 *
 * Production build: `import.meta.env.DEV` is false → all calls are no-ops
 * with zero runtime cost beyond a function-call boundary.
 *
 * Usage (recommended — `useSaveTelemetry`):
 *   const t = useSaveTelemetry('hero-editor');
 *   const persist = async () => {
 *     t.event('save-clicked', { headline: formData.headline });
 *     await mutate(...);
 *     t.event('mutation-success');
 *     t.flush();
 *   };
 *
 * Usage (low-level — `createEditorTelemetry`):
 *   const t = createEditorTelemetry('one-off-script');
 *   t.event('start'); ... t.flush();
 */

type TelemetryEntry = {
  /** ms since the telemetry session started */
  t: number;
  event: string;
  payload?: unknown;
};

export interface EditorTelemetry {
  /** Record an event in the current session. No-op in production. */
  event(name: string, payload?: unknown): void;
  /** Emit the grouped log and reset. No-op in production or when empty. */
  flush(): void;
}

const noop: EditorTelemetry = {
  event: () => {},
  flush: () => {},
};

// ─────────────────────────────────────────────────────────────────────────
// Ambient trace registry
// ─────────────────────────────────────────────────────────────────────────
// Shared infrastructure (triggerPreviewRefresh, broadcastDraftWrite) emits
// events into whatever trace is currently active. The active trace is set
// when an editor's save flow begins and cleared on flush. Multiple editors
// can never have overlapping traces in practice (one save at a time per
// user), so a single global slot is sufficient.
let ambientTrace: EditorTelemetry | null = null;

/**
 * Internal: emit an event into the active ambient trace (if any).
 * Called from `triggerPreviewRefresh()` and `broadcastDraftWrite()` so
 * cross-cutting infrastructure events appear in editor save traces
 * automatically — without those modules importing per-editor scopes.
 */
export function emitAmbientTelemetry(name: string, payload?: unknown): void {
  if (!import.meta.env.DEV) return;
  ambientTrace?.event(name, payload);
}

export function createEditorTelemetry(scope: string): EditorTelemetry {
  if (!import.meta.env.DEV) return noop;

  let entries: TelemetryEntry[] = [];
  let started = performance.now();

  const instance: EditorTelemetry = {
    event(name, payload) {
      if (entries.length === 0) {
        started = performance.now();
        // Become the ambient trace so shared infra emits into us.
        ambientTrace = instance;
      }
      entries.push({
        t: Math.round(performance.now() - started),
        event: name,
        payload,
      });
    },
    flush() {
      if (entries.length === 0) return;
      const totalMs = entries[entries.length - 1].t;
      // eslint-disable-next-line no-console
      console.groupCollapsed(`[${scope}] save trace · ${totalMs}ms · ${entries.length} events`);
      for (const e of entries) {
        // eslint-disable-next-line no-console
        console.log(`+${String(e.t).padStart(4, ' ')}ms  ${e.event}`, e.payload ?? '');
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
      entries = [];
      // Release the ambient slot so subsequent unrelated infra events
      // (e.g. background polling) don't pile up against a stale trace.
      if (ambientTrace === instance) ambientTrace = null;
    },
  };
  return instance;
}
