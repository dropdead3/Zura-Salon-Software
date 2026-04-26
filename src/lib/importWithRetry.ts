type ImportWithRetryOptions = {
  maxRetries?: number;
  reloadKey?: string;
  baseDelayMs?: number;
  /** Maximum number of full-page reloads attempted before surfacing the failure. */
  maxReloads?: number;
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_RELOADS = 2;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readReloadCount(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return 0;
    // Backward-compat: legacy boolean flag ('true') counts as 1 reload.
    if (raw === 'true') return 1;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeReloadCount(key: string, value: number) {
  if (typeof window === 'undefined') return;
  try {
    if (value <= 0) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // Ignore storage access issues and continue without the reload guard.
  }
}

export async function importWithRetry<T>(
  importer: () => Promise<T>,
  options: ImportWithRetryOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    reloadKey = 'moduleRetryReloaded',
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxReloads = DEFAULT_MAX_RELOADS,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const module = await importer();
      // Successful import — clear any prior reload counter.
      writeReloadCount(reloadKey, 0);
      return module;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (!isLastAttempt) {
        // Fast retries: 200ms, 400ms, 800ms instead of 1s, 2s, 4s
        await wait(baseDelayMs * 2 ** attempt);
        continue;
      }

      const reloadCount = readReloadCount(reloadKey);
      if (reloadCount < maxReloads && typeof window !== 'undefined') {
        writeReloadCount(reloadKey, reloadCount + 1);
        // Reload the EXACT current URL — never let a chunk failure drop the
        // user onto '/' or any other route. window.location.reload() preserves
        // pathname/search/hash by definition.
        window.location.reload();
        return new Promise<T>(() => {});
      }

      // Bounded out — surface to ErrorBoundary instead of looping.
      // Clear the counter so a future successful navigation isn't blocked.
      writeReloadCount(reloadKey, 0);
      throw error;
    }
  }

  throw new Error('importWithRetry: unexpected exit');
}
