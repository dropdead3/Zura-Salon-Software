import { lazy, ComponentType } from 'react';

type ComponentModule = { default: ComponentType<any> };

const MAX_RETRIES = 3;
const SESSION_KEY = 'lazyRetryReloaded';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function lazyWithRetry(
  componentImport: () => Promise<ComponentModule>,
) {
  return lazy(async () => {
    const hasReloaded = sessionStorage.getItem(SESSION_KEY) === 'true';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const module = await componentImport();
        // Success — clear the reload flag if it was set
        sessionStorage.removeItem(SESSION_KEY);
        return module;
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          await wait(Math.pow(2, attempt) * 1000);
        } else if (!hasReloaded) {
          // All retries exhausted — reload the page once
          sessionStorage.setItem(SESSION_KEY, 'true');
          window.location.reload();
          // Return a never-resolving promise to prevent React from rendering while reloading
          return new Promise<ComponentModule>(() => {});
        } else {
          // Already reloaded once — throw so ErrorBoundary catches it
          throw error;
        }
      }
    }

    // TypeScript: unreachable but satisfies return type
    throw new Error('lazyWithRetry: unexpected exit');
  });
}
