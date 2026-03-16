import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { useOrganizationFeatureFlags } from '@/hooks/useOrganizationFeatureFlags';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';

interface AccountAppsCardProps {
  organizationId: string;
}

export function AccountAppsCard({ organizationId }: AccountAppsCardProps) {
  const { data: flags, isLoading: flagsLoading } = useOrganizationFeatureFlags(organizationId);
  const { entitlements, isLoading: entitlementsLoading } = useBackroomLocationEntitlements(organizationId);

  const isLoading = flagsLoading || entitlementsLoading;

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

  const backroomFlag = flags?.find((f) => f.flag_key === 'backroom_enabled');
  const isBackroomEnabled = backroomFlag?.org_enabled ?? false;
  const activeLocations = entitlements.filter((e) => e.status === 'active').length;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <PlatformCardTitle className="text-lg">Apps in Use</PlatformCardTitle>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="divide-y divide-slate-700/50">
          {/* Zura Backroom */}
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Package className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--platform-foreground))]">Zura Backroom</p>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {isBackroomEnabled
                    ? `${activeLocations} active ${activeLocations === 1 ? 'location' : 'locations'}`
                    : '--'}
                </p>
              </div>
            </div>
            <PlatformBadge variant={isBackroomEnabled ? 'success' : 'default'}>
              {isBackroomEnabled ? 'Active' : 'Not Enabled'}
            </PlatformBadge>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
