/**
 * authFlowTelemetry — listener that observes 'zura:auth-flow-complete'
 * events emitted by clearAuthFlow() and surfaces post-login handoff
 * latency for observability.
 *
 * Currently dev-only: logs each event and a rolling p50/p95 summary to
 * the console. Production sink is a Deferral Register item (see
 * mem://architecture/visibility-contracts.md) — when we standardize
 * an analytics provider, swap the dev console block for the real
 * forwarder. The CustomEvent contract stays the same.
 *
 * Mounted once from <App />.
 */

interface AuthFlowCompleteDetail {
  durationMs: number;
  route: string;
  ttlExpired: boolean;
}

const samples: number[] = [];
const MAX_SAMPLES = 50;
let summaryTimer: ReturnType<typeof setTimeout> | null = null;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function scheduleSummary(): void {
  if (summaryTimer || !import.meta.env.DEV) return;
  summaryTimer = setTimeout(() => {
    summaryTimer = null;
    if (samples.length === 0) return;
    const sorted = [...samples].sort((a, b) => a - b);
    // eslint-disable-next-line no-console
    console.info(
      `[authFlowTelemetry] handoffs=${sorted.length} ` +
        `p50=${percentile(sorted, 50)}ms p95=${percentile(sorted, 95)}ms ` +
        `max=${sorted[sorted.length - 1]}ms`,
    );
  }, 60_000);
}

export function installAuthFlowTelemetry(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const detail = (e as CustomEvent<AuthFlowCompleteDetail>).detail;
    if (!detail || typeof detail.durationMs !== 'number') return;

    samples.push(detail.durationMs);
    if (samples.length > MAX_SAMPLES) samples.shift();

    if (import.meta.env.DEV) {
      const tag = detail.ttlExpired ? ' [TTL_EXPIRED]' : '';
      // eslint-disable-next-line no-console
      console.info(
        `[authFlowSentinel] handoff resolved in ${detail.durationMs}ms on ${detail.route}${tag}`,
      );
      scheduleSummary();
    }

    // Production sink — currently a no-op. When we ship an analytics
    // provider, forward { event: 'auth_flow_complete', ...detail } here.
    // Deferral Register: mem://architecture/visibility-contracts.md
  };

  window.addEventListener('zura:auth-flow-complete', handler);
  return () => window.removeEventListener('zura:auth-flow-complete', handler);
}
