import { Package, Play, MessageSquare, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { useOrganizationFeatureFlags, useUpdateOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import { useColorBarLocationEntitlements } from '@/hooks/color-bar/useColorBarLocationEntitlements';

interface AccountAppsCardProps {
  organizationId: string;
}

export function AccountAppsCard({ organizationId }: AccountAppsCardProps) {
  const { data: flags, isLoading: flagsLoading } = useOrganizationFeatureFlags(organizationId);
  const { entitlements, isLoading: entitlementsLoading } = useColorBarLocationEntitlements(organizationId);
  const updateFlag = useUpdateOrgFeatureFlag();

  const isLoading = flagsLoading || entitlementsLoading;

  const handleLaunchDemo = () => {
    window.open(`/dock?demo=${organizationId}`, '_blank');
  };

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
                onCheckedChange={() => handleToggleFlag('backroom_enabled', isColorBarEnabled)}
                disabled={updateFlag.isPending}
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
              />
            </div>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
