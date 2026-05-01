/**
 * Editor save-state telemetry — dev-only console grouping that makes
 * post-save refetch races visible at a glance.
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
 * Wiring `editorSaveTelemetry` at each checkpoint produces a single grouped
 * log per save attempt so the order of events (and the form snapshot at
 * each point) is obvious in DevTools without an extra debugger.
 *
 * Production build: `import.meta.env.DEV` is false → all calls are no-ops
 * with zero runtime cost beyond a function-call boundary.
 *
 * Usage
 * ─────
 *   const t = createEditorTelemetry('promo-editor');
 *   t.event('save-clicked', { headline: formData.headline });
 *   t.event('mutation-success', { saved: next });
 *   t.event('refetch-result', { settings });
 *   t.event('form-snapshot', { formData });
 *   t.flush(); // emit grouped log; no-op if no events recorded
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

export function createEditorTelemetry(scope: string): EditorTelemetry {
  if (!import.meta.env.DEV) return noop;

  let entries: TelemetryEntry[] = [];
  let started = performance.now();

  return {
    event(name, payload) {
      if (entries.length === 0) started = performance.now();
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
    },
  };
}
