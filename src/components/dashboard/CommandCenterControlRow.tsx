import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AIInsightsDrawer } from '@/components/dashboard/AIInsightsDrawer';
import { PersonalInsightsDrawer } from '@/components/dashboard/PersonalInsightsDrawer';
import { AnnouncementsDrawer } from '@/components/dashboard/AnnouncementsDrawer';
import { LiveSessionIndicator } from '@/components/dashboard/LiveSessionIndicator';
import { PhorestSyncPopout } from '@/components/dashboard/PhorestSyncPopout';
import { DashboardCustomizeMenu } from '@/components/dashboard/DashboardCustomizeMenu';
import { AnalyticsFilterBar } from '@/components/dashboard/AnalyticsFilterBar';
import type { AnalyticsFilters, DateRangeType } from '@/components/dashboard/PinnedAnalyticsCard';

interface RoleContext {
  isLeadership: boolean;
  hasStylistRole: boolean;
  isFrontDesk: boolean;
  isReceptionist: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface CommandCenterControlRowProps {
  isLeadership: boolean;
  analyticsFilters: AnalyticsFilters;
  onLocationChange: (value: string) => void;
  onDateRangeChange: (value: DateRangeType) => void;
  accessibleLocations: Location[];
  canViewAggregate: boolean;
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
  roleContext: RoleContext;
}

export function CommandCenterControlRow({
  isLeadership,
  analyticsFilters,
  onLocationChange,
  onDateRangeChange,
  accessibleLocations,
  canViewAggregate,
  compact,
  onCompactChange,
  roleContext,
}: CommandCenterControlRowProps) {
  return (
    <div className="pt-6 pb-2">
      <div className="flex items-center justify-between gap-3 flex-nowrap overflow-hidden">
        {/* LEFT CLUSTER: Context items — collapses first */}
        <div className="flex items-center gap-3 min-w-0 shrink">
          {isLeadership ? <AIInsightsDrawer /> : <PersonalInsightsDrawer />}
          <div className="hidden sm:flex">
            <AnnouncementsDrawer isLeadership={isLeadership} />
          </div>
          <div className="hidden lg:flex">
            <LiveSessionIndicator locationId={analyticsFilters.locationId} />
          </div>
        </div>

        {/* RIGHT CLUSTER: Filters — higher priority, never wraps */}
        <div className="shrink-0">
          <AnalyticsFilterBar
            locationId={analyticsFilters.locationId}
            onLocationChange={onLocationChange}
            dateRange={analyticsFilters.dateRange}
            onDateRangeChange={onDateRangeChange}
            accessibleLocations={accessibleLocations}
            canViewAggregate={canViewAggregate}
            compact={compact}
            onCompactChange={onCompactChange}
            leadingContent={
              <div className="flex items-center gap-1">
                {isLeadership && <PhorestSyncPopout />}
                <DashboardCustomizeMenu roleContext={roleContext} />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
