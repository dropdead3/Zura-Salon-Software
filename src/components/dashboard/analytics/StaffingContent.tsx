import { HiringCapacityCard } from '@/components/dashboard/HiringCapacityCard';
import { StaffingTrendChart } from '@/components/dashboard/StaffingTrendChart';
import { StylistWorkloadCard } from '@/components/dashboard/StylistWorkloadCard';
import { StaffRevenueLeaderboard } from '@/components/dashboard/analytics/StaffRevenueLeaderboard';
import { StaffOverviewCard, StylistsOverviewCard } from '@/components/dashboard/StylistsOverviewCard';
import { StylistExperienceCard } from '@/components/dashboard/analytics/StylistExperienceCard';
import { LevelReadinessCard } from '@/components/dashboard/analytics/LevelReadinessCard';
import { LevelProgressKpiCard } from '@/components/dashboard/LevelProgressNudge';
import { DoubleBookingCard } from '@/components/dashboard/analytics/DoubleBookingCard';

import { StaffWorkload } from '@/hooks/useStaffUtilization';

interface StaffingContentProps {
  workload: StaffWorkload[];
  isLoading: boolean;
  locationId?: string;
  dateRange?: 'tomorrow' | '7days' | '30days' | '90days';
}

export function StaffingContent({ workload, isLoading, locationId, dateRange = '30days' }: StaffingContentProps) {
  return (
    <>
      {/* Team Overview Cards */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <StaffOverviewCard />
        <StylistsOverviewCard />
      </div>


      {/* Hiring Capacity and Staffing Trends */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <HiringCapacityCard />
        <StaffingTrendChart />
      </div>

      {/* Standalone cards with consistent spacing */}
      <div className="space-y-6">
        <LevelProgressKpiCard />

        <LevelReadinessCard />

        <StylistWorkloadCard 
          workload={workload}
          isLoading={isLoading}
        />

        <StaffRevenueLeaderboard locationId={locationId} />

        <StylistExperienceCard 
          locationId={locationId} 
          dateRange={dateRange}
        />

        <DoubleBookingCard 
          locationId={locationId}
          dateRange={dateRange}
        />
      </div>
    </>
  );
}
