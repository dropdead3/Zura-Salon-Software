/**
 * useDockFeatureSettings — Resolves org-wide Dock feature flags.
 *
 * - Assistant Prep: backroom_settings key `dock_assistant_prep_enabled`
 * - Formula Memory: backroom_settings key `dock_formula_memory_enabled`
 * - Smart Mix Assist: reads from existing `smart_mix_assist_settings.is_enabled`
 */

import { useBackroomSetting } from './useBackroomSettings';
import { useSmartMixAssistSettings } from './useSmartMixAssist';

export function useDockFeatureSettings() {
  const { data: assistantPrepSetting, isLoading: apLoading } = useBackroomSetting('dock_assistant_prep_enabled');
  const { data: formulaMemorySetting, isLoading: fmLoading } = useBackroomSetting('dock_formula_memory_enabled');
  const { data: smartMixSettings, isLoading: smLoading } = useSmartMixAssistSettings();

  return {
    assistantPrepEnabled: (assistantPrepSetting?.value?.enabled as boolean) ?? false,
    formulaMemoryEnabled: (formulaMemorySetting?.value?.enabled as boolean) ?? true, // default ON
    smartMixAssistEnabled: smartMixSettings?.is_enabled ?? false,
    isLoading: apLoading || fmLoading || smLoading,
  };
}
