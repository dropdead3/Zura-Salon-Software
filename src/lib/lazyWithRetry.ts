import { lazy, type ComponentType } from 'react';
import { importWithRetry } from '@/lib/importWithRetry';

type ComponentModule = { default: ComponentType<any> };

export function lazyWithRetry(componentImport: () => Promise<ComponentModule>) {
  return lazy(() =>
    importWithRetry(componentImport, {
      reloadKey: 'lazyRetryReloaded',
    }),
  );
}
