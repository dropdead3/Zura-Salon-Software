/**
 * useColorBarToggle — Centralized toggle logic for the org-level Color Bar
 * master switch. Used by both the Platform Color Bar Entitlements tab and the
 * org account Apps card so both surfaces share the same:
 *   - optimistic UI
 *   - advisory toast on slow operations
 *   - soft-disable cascade (preserve flag row + suspend location entitlements)
 *   - first-time activation cascade (create per-location entitlements)
 *   - reactivation flow (sets requires_inventory_reconciliation = true)
 *
 * Doctrine: a single trust-boundary handler. Bypassing this hook is what
 * caused orphaned entitlements + missed reconciliation flags.
 */
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import {
  useBulkSuspendLocationEntitlements,
  useBulkReactivateLocationEntitlements,
} from '@/hooks/color-bar/useColorBarLocationEntitlements';
import { fetchReactivationStatus } from '@/hooks/color-bar/useReactivationStatus';

/**
 * Best-effort audit log writer — never blocks the toggle flow if the audit
 * insert fails. Network Intelligence: feeds churn-pattern aggregations.
 */
async function logSuspensionEvent(params: {
  organization_id: string;
  event_type: 'suspended' | 'reactivated';
  reason?: string | null;
  notes?: string | null;
  affected_location_count: number;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('color_bar_suspension_events').insert({
      organization_id: params.organization_id,
      event_type: params.event_type,
      reason: params.reason ?? null,
      notes: params.notes ?? null,
      actor_user_id: user?.id ?? null,
      affected_location_count: params.affected_location_count,
    } as any);
  } catch (err) {
    // Non-blocking — log to console only
    console.warn('[color-bar] failed to write suspension audit event', err);
  }
}

export interface ReactivationTarget {
  organizationId: string;
  organizationName: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  locationNames: string[];
}

export interface SuspensionTarget {
  organizationId: string;
  organizationName: string;
  optimisticPatch?: (next: boolean) => () => void;
}

interface ToggleArgs {
  organizationId: string;
  organizationName: string;
  /** Current value of backroom_enabled. */
  currentlyEnabled: boolean;
  /** Optional optimistic patch (e.g. flip a row in the platform table cache). */
  optimisticPatch?: (next: boolean) => () => void;
}

/**
 * Returns the centralized toggle handler plus state needed to render the
 * reactivation confirmation dialog.
 */
export function useColorBarToggle() {
  const queryClient = useQueryClient();
  const updateFlag = useUpdateOrgFeatureFlag();
  const bulkSuspend = useBulkSuspendLocationEntitlements();
  const bulkReactivate = useBulkReactivateLocationEntitlements();

  const [reactivationTarget, setReactivationTarget] =
    useState<ReactivationTarget | null>(null);
  const [suspensionTarget, setSuspensionTarget] =
    useState<SuspensionTarget | null>(null);

  const isPending =
    updateFlag.isPending || bulkSuspend.isPending || bulkReactivate.isPending;

  /** Schedule a 'this may take a moment' toast if op exceeds 800ms. */
  const scheduleAdvisoryToast = (message: string) => {
    let toastId: string | number | undefined;
    const timer = window.setTimeout(() => {
      toastId = toast.loading(message);
    }, 800);
    return {
      dismiss: () => {
        window.clearTimeout(timer);
        if (toastId !== undefined) toast.dismiss(toastId);
      },
    };
  };

  const softDisable = useCallback(
    async (
      args: ToggleArgs,
      meta?: { reason?: string; notes?: string },
    ) => {
      const rollback = args.optimisticPatch?.(false);
      const advisory = scheduleAdvisoryToast(
        `Suspending Color Bar across ${args.organizationName}'s locations…`,
      );
      try {
        await updateFlag.mutateAsync({
          organizationId: args.organizationId,
          flagKey: 'backroom_enabled',
          isEnabled: false,
          reason:
            meta?.reason
              ? `Suspended (${meta.reason})${meta.notes ? `: ${meta.notes}` : ''}`
              : 'Suspended via Color Bar admin',
        });
        const suspendedRows = await bulkSuspend.mutateAsync({
          organization_id: args.organizationId,
          reason: meta?.reason,
          notes: meta?.notes,
        });
        await logSuspensionEvent({
          organization_id: args.organizationId,
          event_type: 'suspended',
          reason: meta?.reason ?? null,
          notes: meta?.notes ?? null,
          affected_location_count: Array.isArray(suspendedRows)
            ? suspendedRows.length
            : 0,
        });
        // Invalidate cached reactivation status so next toggle reads fresh data
        queryClient.invalidateQueries({
          queryKey: ['color-bar-reactivation-status', args.organizationId],
        });
        advisory.dismiss();
        toast.success(
          `Color Bar suspended for ${args.organizationName} — data preserved`,
        );
      } catch (err: any) {
        advisory.dismiss();
        rollback?.();
        toast.error(
          'Could not suspend Color Bar: ' + (err?.message ?? 'unknown error'),
        );
      }
    },
    [updateFlag, bulkSuspend],
  );

  const firstTimeEnable = useCallback(
    async (args: ToggleArgs) => {
      const rollback = args.optimisticPatch?.(true);
      const advisory = scheduleAdvisoryToast(
        `Activating Color Bar across ${args.organizationName}'s locations…`,
      );
      try {
        await updateFlag.mutateAsync({
          organizationId: args.organizationId,
          flagKey: 'backroom_enabled',
          isEnabled: true,
          reason: 'Enabled via Color Bar admin',
        });

        // Defensive: only insert rows that don't already exist. This prevents
        // resurrecting suspended rows without setting the reconciliation flag.
        const { data: existing } = await supabase
          .from('backroom_location_entitlements')
          .select('location_id')
          .eq('organization_id', args.organizationId);
        const existingLocIds = new Set(
          (existing ?? []).map((e: any) => e.location_id),
        );

        const { data: locs } = await supabase
          .from('locations')
          .select('id')
          .eq('organization_id', args.organizationId)
          .eq('is_active', true);

        const toInsert = (locs ?? []).filter(
          (l: any) => !existingLocIds.has(l.id),
        );

        if (toInsert.length > 0) {
          await supabase.from('backroom_location_entitlements').insert(
            toInsert.map((l: any) => ({
              organization_id: args.organizationId,
              location_id: l.id,
              plan_tier: 'standard',
              scale_count: 0,
              status: 'active',
              billing_interval: 'monthly',
              activated_at: new Date().toISOString(),
            })),
          );
        }

        queryClient.invalidateQueries({
          queryKey: ['platform-color-bar-entitlements'],
        });
        queryClient.invalidateQueries({
          queryKey: ['platform-color-bar-all-entitlement-counts'],
        });
        queryClient.invalidateQueries({
          queryKey: ['color-bar-location-entitlements', args.organizationId],
        });
        advisory.dismiss();
        toast.success(
          `Color Bar enabled for ${args.organizationName}${
            toInsert.length > 0
              ? ` — ${toInsert.length} location${toInsert.length === 1 ? '' : 's'} activated`
              : ''
          }`,
        );
      } catch (err: any) {
        advisory.dismiss();
        rollback?.();
        toast.error(
          'Could not enable Color Bar: ' + (err?.message ?? 'unknown error'),
        );
      }
    },
    [updateFlag, queryClient],
  );

  const reactivate = useCallback(
    async (args: ToggleArgs) => {
      const rollback = args.optimisticPatch?.(true);
      const advisory = scheduleAdvisoryToast(
        `Reactivating Color Bar across ${args.organizationName}'s locations…`,
      );
      try {
        await updateFlag.mutateAsync({
          organizationId: args.organizationId,
          flagKey: 'backroom_enabled',
          isEnabled: true,
          reason: 'Reactivated via Color Bar admin',
        });
        const reactivated = await bulkReactivate.mutateAsync({
          organization_id: args.organizationId,
        });
        advisory.dismiss();
        toast.success(
          `Color Bar reactivated for ${args.organizationName} — ${reactivated.length} location${
            reactivated.length === 1 ? '' : 's'
          } require inventory verification`,
        );
      } catch (err: any) {
        advisory.dismiss();
        rollback?.();
        toast.error(
          'Could not reactivate Color Bar: ' + (err?.message ?? 'unknown error'),
        );
      }
    },
    [updateFlag, bulkReactivate],
  );

  /**
   * Top-level handler. Inspects current state + suspended-row presence and
   * routes to the correct flow. For reactivations, opens the confirmation
   * dialog and defers the mutation until the caller confirms.
   */
  const toggle = useCallback(
    async (args: ToggleArgs) => {
      if (args.currentlyEnabled) {
        // Capture cancel reason BEFORE running the cascade.
        setSuspensionTarget({
          organizationId: args.organizationId,
          organizationName: args.organizationName,
          optimisticPatch: args.optimisticPatch,
        });
        return;
      }
      // Currently OFF → check for prior suspension
      const { data: suspendedRows } = await supabase
        .from('backroom_location_entitlements')
        .select('location_id, suspended_at, suspended_reason')
        .eq('organization_id', args.organizationId)
        .eq('status', 'suspended')
        .order('suspended_at', { ascending: false });

      if (suspendedRows && suspendedRows.length > 0) {
        const locIds = suspendedRows.map((r: any) => r.location_id);
        const { data: locs } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', locIds);
        const nameMap = new Map((locs ?? []).map((l: any) => [l.id, l.name]));
        setReactivationTarget({
          organizationId: args.organizationId,
          organizationName: args.organizationName,
          suspendedAt: (suspendedRows[0] as any).suspended_at as string | null,
          suspendedReason:
            (suspendedRows[0] as any).suspended_reason as string | null,
          locationNames: locIds.map(
            (id: string) => nameMap.get(id) ?? 'Unknown location',
          ),
        });
        // Caller's optimistic patch must NOT have run yet — keep switch OFF
        // until the user confirms.
        return;
      }

      await firstTimeEnable(args);
    },
    [firstTimeEnable],
  );

  /** Confirm callback for the reactivation dialog. */
  const confirmReactivation = useCallback(
    async (optimisticPatch?: ToggleArgs['optimisticPatch']) => {
      if (!reactivationTarget) return;
      const target = reactivationTarget;
      setReactivationTarget(null);
      await reactivate({
        organizationId: target.organizationId,
        organizationName: target.organizationName,
        currentlyEnabled: false,
        optimisticPatch,
      });
    },
    [reactivationTarget, reactivate],
  );

  const cancelReactivation = useCallback(() => {
    setReactivationTarget(null);
  }, []);

  /** Confirm callback for the cancel-reason (suspension) dialog. */
  const confirmSuspension = useCallback(
    async (meta: { reason: string; notes: string }) => {
      if (!suspensionTarget) return;
      const target = suspensionTarget;
      setSuspensionTarget(null);
      await softDisable(
        {
          organizationId: target.organizationId,
          organizationName: target.organizationName,
          currentlyEnabled: true,
          optimisticPatch: target.optimisticPatch,
        },
        meta,
      );
    },
    [suspensionTarget, softDisable],
  );

  const cancelSuspension = useCallback(() => {
    setSuspensionTarget(null);
  }, []);

  return {
    toggle,
    reactivationTarget,
    confirmReactivation,
    cancelReactivation,
    suspensionTarget,
    confirmSuspension,
    cancelSuspension,
    isPending,
    /** Direct primitives if a caller needs them (batch ops, etc.). */
    softDisable,
    firstTimeEnable,
    reactivate,
  };
}
