import { useEffect, useRef } from 'react';
import {
  createEditorTelemetry,
  type EditorTelemetry,
} from '@/lib/editor-telemetry';

/**
 * Doctrine hook: every website editor's save flow should call this and
 * log its scope-specific checkpoints (see editor-telemetry.ts for the
 * full rationale). Cross-cutting infrastructure events (preview refresh,
 * draft write) are captured automatically via the ambient trace registry.
 *
 * Auto-flushes the active trace on unmount so editors that close mid-save
 * still produce a partial log.
 */
export function useSaveTelemetry(scope: string): EditorTelemetry {
  const ref = useRef<EditorTelemetry | null>(null);
  if (ref.current === null) {
    ref.current = createEditorTelemetry(scope);
  }
  useEffect(() => {
    const t = ref.current!;
    return () => {
      t.flush();
    };
  }, []);
  return ref.current;
}
