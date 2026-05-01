/**
 * `useSectionEditor` — opinionated scaffold for any Website Editor surface
 * that edits a single `useSectionConfig`-shaped record.
 *
 * Bundles the four moving parts every editor must wire correctly:
 *   1. local working copy (`localConfig` + `setLocalConfig`)
 *   2. preview bridge (debounced postMessage to the preview iframe)
 *   3. canonical dirty-state broadcast (so the shell's Save bar activates)
 *   4. save action handler (broadcasts `editor-saving-state`, clears
 *      preview override, fires telemetry, refreshes preview)
 *
 * Why this exists:
 *   The four pieces above are independent hooks today, and forgetting any
 *   one of them silently breaks the editor (commonly: missing `useDirtyState`
 *   ships a dead Save button). Centralizing them here means new section
 *   editors are *structurally* unable to omit the dirty wiring — you only
 *   call one hook, and it returns the saver/state already wired up.
 *
 * Usage:
 *   const editor = useSectionEditor({
 *     configHook: useStickyFooterBarConfig,
 *     sectionKey: 'section_sticky_footer_bar',
 *     scope: 'sticky-footer-bar-editor',
 *     normalize: (cfg) => ({ ...cfg, page_exclusions: dedupe(cfg.page_exclusions) }),
 *   });
 *   useEditorSaveAction(editor.handleSave);
 *
 *   if (editor.isLoading) return <Loader />;
 *   return <ToggleInput value={editor.localConfig.enabled}
 *                        onChange={(v) => editor.updateField('enabled', v)} />;
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useDirtyState } from '@/hooks/useDirtyState';
import { useEditorDiscardAction } from '@/hooks/useEditorDiscardAction';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import {
  usePreviewBridge,
  clearPreviewOverride,
} from '@/hooks/usePreviewBridge';
import { triggerPreviewRefresh } from '@/lib/preview-utils';

interface SectionConfigHookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  update: (next: T) => Promise<unknown>;
}

export interface UseSectionEditorOptions<T> {
  /**
   * The typed config hook from `useSectionConfig.ts`
   * (e.g. `useStickyFooterBarConfig`). Must return `{ data, isLoading, update }`.
   */
  configHook: () => SectionConfigHookResult<T>;
  /**
   * The site-settings key this editor writes to. Mirrors the first arg
   * passed to `useSectionConfig` inside the configHook implementation —
   * the bridge uses it to address the preview iframe override.
   */
  sectionKey: string;
  /**
   * Telemetry scope (kebab-case). Used as the `useSaveTelemetry` namespace.
   */
  scope: string;
  /**
   * Default value when the server returns no record yet. Optional — when
   * omitted, the hook seeds `localConfig` with `{} as T` until first load.
   * Prefer passing the same `DEFAULT_*` constant the configHook uses so
   * the editor renders meaningful defaults during cold-start.
   */
  defaults?: T;
  /**
   * Optional pre-save normalizer (trim whitespace, dedupe arrays, etc.).
   * Receives the live local config and must return the value actually
   * persisted. Also rehydrates `localConfig` so the form reflects the
   * normalized shape post-save.
   */
  normalize?: (config: T) => T;
  /**
   * Override the success toast copy. Defaults to `"Saved"`.
   */
  successMessage?: string;
}

export interface UseSectionEditorResult<T> {
  localConfig: T;
  setLocalConfig: React.Dispatch<React.SetStateAction<T>>;
  isLoading: boolean;
  isDirty: boolean;
  /** Type-safe field setter (preserves immutability). */
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Reset to `defaults` (or `{} as T` if none provided). */
  resetToDefaults: () => void;
  /** Wire this into `useEditorSaveAction(editor.handleSave)`. */
  handleSave: () => Promise<void>;
}

export function useSectionEditor<T extends object>(
  options: UseSectionEditorOptions<T>,
): UseSectionEditorResult<T> {
  const {
    configHook,
    sectionKey,
    scope,
    defaults,
    normalize,
    successMessage = 'Saved',
  } = options;

  const __saveTelemetry = useSaveTelemetry(scope);
  const { data, isLoading, update } = configHook();
  const { effectiveOrganization } = useOrganizationContext();

  const [localConfig, setLocalConfig] = useState<T>(
    (defaults ?? ({} as T)) as T,
  );

  // Keep localConfig in sync with server-fetched data on first load and
  // after invalidations (post-save). Mirrors the pattern every section
  // editor previously hand-rolled.
  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  // Debounced preview bridge — avoids flooding postMessage on keystroke.
  const debouncedConfig = useDebounce(localConfig, 300);
  usePreviewBridge(sectionKey, debouncedConfig);

  // Canonical dirty-state broadcast. This is the line whose absence ships
  // a dead Save button — bundling it here means the gap is structurally
  // impossible for editors that adopt this scaffold.
  const isDirty = useDirtyState(localConfig, data);

  // Reset local working copy back to last-saved server data when the shell
  // dispatches `editor-discard-request`. Confirmation lives in the shell.
  useEditorDiscardAction(useCallback(() => {
    if (data) {
      setLocalConfig(data);
      clearPreviewOverride(sectionKey, effectiveOrganization?.id ?? null);
    }
  }, [data, sectionKey, effectiveOrganization?.id]));

  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setLocalConfig((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetToDefaults = useCallback(() => {
    setLocalConfig((defaults ?? ({} as T)) as T);
  }, [defaults]);

  const handleSave = useCallback(async () => {
    try {
      const normalized = normalize ? normalize(localConfig) : localConfig;
      await update(normalized);
      // Rehydrate so the form reflects the normalized shape and the dirty
      // compare clears immediately (no stale "Unsaved changes" pill).
      setLocalConfig(normalized);
      toast.success(successMessage);
      clearPreviewOverride(sectionKey, effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success');
      triggerPreviewRefresh();
      __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [
    localConfig,
    normalize,
    update,
    successMessage,
    sectionKey,
    effectiveOrganization?.id,
    __saveTelemetry,
  ]);

  return {
    localConfig,
    setLocalConfig,
    isLoading,
    isDirty,
    updateField,
    resetToDefaults,
    handleSave,
  };
}
