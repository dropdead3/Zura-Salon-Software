import { Package, Play, MessageSquare, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  useOrganizationFeatureFlags,
  useUpdateOrgFeatureFlag,
  type MergedFeatureFlag,
} from '@/hooks/useOrganizationFeatureFlags';
import { useColorBarLocationEntitlements } from '@/hooks/color-bar/useColorBarLocationEntitlements';
import { useColorBarToggle } from '@/hooks/color-bar/useColorBarToggle';
import { usePrefetchReactivationStatus } from '@/hooks/color-bar/useReactivationStatus';
import { useQueryClient } from '@tanstack/react-query';
import { ReactivationConfirmDialog } from '@/components/platform/color-bar/ReactivationConfirmDialog';
import { CancelReasonDialog } from '@/components/platform/color-bar/CancelReasonDialog';

interface AccountAppsCardProps {
  organizationId: string;
  organizationName?: string;
}

export function AccountAppsCard({ organizationId, organizationName }: AccountAppsCardProps) {
  const { data: flags, isLoading: flagsLoading } = useOrganizationFeatureFlags(organizationId);
  const { entitlements, isLoading: entitlementsLoading } = useColorBarLocationEntitlements(organizationId);
  const updateFlag = useUpdateOrgFeatureFlag();
  const colorBarToggle = useColorBarToggle();
  const prefetchReactivation = usePrefetchReactivationStatus();
  const queryClient = useQueryClient();

  const isLoading = flagsLoading || entitlementsLoading;

  /**
   * Optimistically flip backroom_enabled in the merged-flags cache so the
   * Switch + "active locations" caption update instantly. Returns rollback.
   */
  const optimisticallyFlipColorBar = (next: boolean) => {
    const key = ['organization-feature-flags', organizationId];
    const prev = queryClient.getQueryData<MergedFeatureFlag[]>(key);
    if (prev) {
      queryClient.setQueryData<MergedFeatureFlag[]>(
        key,
        prev.map((f) =>
          f.flag_key === 'backroom_enabled' ? { ...f, org_enabled: next } : f,
        ),
      );
    }
    return () => {
      if (prev) queryClient.setQueryData(key, prev);
    };
  };

  const handleLaunchDemo = () => {
    window.open(`/dock?demo=${organizationId}`, '_blank');
  };

  /** Generic toggle for non-Color-Bar flags (Connect, Payroll). */
  const handleToggleFlag = (flagKey: string, currentValue: boolean) => {
    updateFlag.mutate({
      organizationId,
      flagKey,
      isEnabled: !currentValue,
      reason: `Toggled by platform admin`,
    });
  };

  if (isLoading) {
    return (
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Apps in Use</PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg bg-slate-700/50" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 bg-slate-700/50" />
                <Skeleton className="h-3 w-36 bg-slate-700/50" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full bg-slate-700/50" />
          </div>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  const colorBarFlag = flags?.find((f) => f.flag_key === 'backroom_enabled');
  const isColorBarEnabled = colorBarFlag?.org_enabled ?? false;
  const activeLocations = entitlements.filter((e) => e.status === 'active').length;

  const connectFlag = flags?.find((f) => f.flag_key === 'connect_enabled');
  const isConnectEnabled = connectFlag?.org_enabled ?? false;

  const payrollFlag = flags?.find((f) => f.flag_key === 'payroll_enabled');
  const isPayrollEnabled = payrollFlag?.org_enabled ?? false;

  /**
   * Color Bar uses the shared toggle hook so this surface gets the same
   * soft-disable + reconciliation flow as the Platform admin tab.
   * The optimistic patch makes the Switch flip instantly on suspend/enable
   * (P0 fix — without it, suspension visibly lagged until the cascade settled).
   */
  const handleColorBarToggle = () =>
    colorBarToggle.toggle({
      organizationId,
      organizationName: organizationName ?? 'this organization',
      currentlyEnabled: isColorBarEnabled,
      optimisticPatch: optimisticallyFlipColorBar,
    });

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <PlatformCardTitle className="text-lg">Apps in Use</PlatformCardTitle>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="divide-y divide-slate-700/50">
          {/* Zura Color Bar */}
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Package className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--platform-foreground))]">Zura Color Bar</p>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {isColorBarEnabled
                    ? `${activeLocations} active ${activeLocations === 1 ? 'location' : 'locations'}`
                    : '--'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLaunchDemo}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-sans font-medium bg-violet-600/15 text-violet-400 hover:bg-violet-600/25 transition-colors"
              >
                <Play className="h-3 w-3" />
                Launch Demo
              </button>
              <Switch
                checked={isColorBarEnabled}
                onCheckedChange={handleColorBarToggle}
                onMouseEnter={() => {
                  if (!isColorBarEnabled) prefetchReactivation(organizationId);
                }}
                onFocus={() => {
                  if (!isColorBarEnabled) prefetchReactivation(organizationId);
                }}
                disabled={
                  colorBarToggle.isPending ||
                  !!colorBarToggle.reactivationTarget ||
                  !!colorBarToggle.suspensionTarget
                }
                className="data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-slate-600"
              />
            </div>
          </div>

          {/* Zura Connect */}
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--platform-foreground))]">Zura Connect</p>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Team & Client Communications
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PlatformBadge variant={isConnectEnabled ? 'success' : 'default'}>
                {isConnectEnabled ? 'Active' : 'Inactive'}
              </PlatformBadge>
              <Switch
                checked={isConnectEnabled}
                onCheckedChange={() => handleToggleFlag('connect_enabled', isConnectEnabled)}
                disabled={updateFlag.isPending}
                className="data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-slate-600"
              />
            </div>
          </div>

          {/* Zura Payroll */}
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--platform-foreground))]">Zura Payroll</p>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Compensation Intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PlatformBadge variant={isPayrollEnabled ? 'success' : 'default'}>
                {isPayrollEnabled ? 'Active' : 'Inactive'}
              </PlatformBadge>
              <Switch
                checked={isPayrollEnabled}
                onCheckedChange={() => handleToggleFlag('payroll_enabled', isPayrollEnabled)}
                disabled={updateFlag.isPending}
                className="data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-slate-600"
              />
            </div>
          </div>
        </div>
      </PlatformCardContent>

      {/* Cancel-reason capture — fires before soft-disabling */}
      <CancelReasonDialog
        open={!!colorBarToggle.suspensionTarget}
        onOpenChange={(open) => {
          if (!open) colorBarToggle.cancelSuspension();
        }}
        orgName={colorBarToggle.suspensionTarget?.organizationName ?? ''}
        isPending={colorBarToggle.isPending}
        onConfirm={(payload) => colorBarToggle.confirmSuspension(payload)}
      />

      {/* Reactivation confirmation — fires when re-enabling an org that was previously suspended */}
      <ReactivationConfirmDialog
        open={!!colorBarToggle.reactivationTarget}
        onOpenChange={(open) => {
          if (!open) colorBarToggle.cancelReactivation();
        }}
        orgName={colorBarToggle.reactivationTarget?.organizationName ?? ''}
        suspendedAt={colorBarToggle.reactivationTarget?.suspendedAt ?? null}
        suspendedReason={colorBarToggle.reactivationTarget?.suspendedReason ?? null}
        affectedLocations={colorBarToggle.reactivationTarget?.locationNames ?? []}
        isPending={colorBarToggle.isPending}
        onConfirm={() => colorBarToggle.confirmReactivation(optimisticallyFlipColorBar)}
      />
    </PlatformCard>
  );
}
