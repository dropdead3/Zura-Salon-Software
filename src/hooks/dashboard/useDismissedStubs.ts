/**
 * useDismissedStubs — Cross-device persistence for dismissed configuration stubs.
 *
 * Stubs (rendered by `<ConfigurationStubCard />`) appear when a user-toggled
 * dashboard section has a missing prerequisite (e.g., Payday Countdown is
 * enabled, but the org has no payroll connection). Operators can dismiss the
 * stub; that dismissal must survive device changes, hence persistence in
 * `user_preferences.dashboard_layout.dismissedStubs[]` rather than localStorage.
 *
 * Reset path: the Customize menu surfaces a "Reset dismissed prompts" action
 * that clears this array.
 */
import { useCallback, useMemo } from 'react';
import { useDashboardLayout, useUpdateDashboardLayout } from '@/hooks/useDashboardLayout';

export function useDismissedStubs() {
  const { layout } = useDashboardLayout();
  const update = useUpdateDashboardLayout();

  const dismissed = useMemo<Set<string>>(
    () => new Set(layout?.dismissedStubs ?? []),
    [layout?.dismissedStubs],
  );

  const isDismissed = useCallback((sectionId: string) => dismissed.has(sectionId), [dismissed]);

  const dismiss = useCallback(
    async (sectionId: string) => {
      if (dismissed.has(sectionId)) return;
      const next = Array.from(new Set([...(layout?.dismissedStubs ?? []), sectionId]));
      await update.mutateAsync({ dismissedStubs: next });
    },
    [dismissed, layout?.dismissedStubs, update],
  );

  const restore = useCallback(
    async (sectionId: string) => {
      if (!dismissed.has(sectionId)) return;
      const next = (layout?.dismissedStubs ?? []).filter((id) => id !== sectionId);
      await update.mutateAsync({ dismissedStubs: next });
    },
    [dismissed, layout?.dismissedStubs, update],
  );

  const restoreAll = useCallback(async () => {
    if (!(layout?.dismissedStubs ?? []).length) return;
    await update.mutateAsync({ dismissedStubs: [] });
  }, [layout?.dismissedStubs, update]);

  return {
    dismissed,
    isDismissed,
    dismiss,
    restore,
    restoreAll,
    isUpdating: update.isPending,
  };
}
