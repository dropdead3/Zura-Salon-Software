type ImportWithRetryOptions = {
  maxRetries?: number;
  reloadKey?: string;
  baseDelayMs?: number;
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readReloadFlag(key: string) {
  if (typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeReloadFlag(key: string, value: boolean) {
  if (typeof window === 'undefined') return;

  try {
    if (value) {
      window.sessionStorage.setItem(key, 'true');
      return;
    }

    window.sessionStorage.removeItem(key);
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
  } = options;

  const hasReloaded = readReloadFlag(reloadKey);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const module = await importer();
      writeReloadFlag(reloadKey, false);
      return module;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (!isLastAttempt) {
        await wait(baseDelayMs * 2 ** attempt);
        continue;
      }

      if (!hasReloaded && typeof window !== 'undefined') {
        writeReloadFlag(reloadKey, true);
        window.location.reload();
        return new Promise<T>(() => {});
      }

      throw error;
    }
  }

  throw new Error('importWithRetry: unexpected exit');
}
