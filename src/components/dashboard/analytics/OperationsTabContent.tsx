import { useState } from 'react';
import { Tabs, TabsContent, SubTabsList, SubTabsTrigger } from '@/components/ui/tabs';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { useOperationalAnalytics } from '@/hooks/useOperationalAnalytics';
import { useStaffUtilization } from '@/hooks/useStaffUtilization';
import { useHistoricalCapacityUtilization } from '@/hooks/useHistoricalCapacityUtilization';
import { useLocations } from '@/hooks/useLocations';
import { useLocationStaffingBalance } from '@/hooks/useLocationStaffingBalance';

// Existing content components
import { OverviewContent } from '@/components/dashboard/analytics/OverviewContent';
import { AppointmentsContent } from '@/components/dashboard/analytics/AppointmentsContent';
import { ClientsContent } from '@/components/dashboard/analytics/ClientsContent';
import { StaffingContent } from '@/components/dashboard/analytics/StaffingContent';
import { StaffUtilizationContent } from '@/components/dashboard/analytics/StaffUtilizationContent';
import { BookingPipelineContent } from '@/components/dashboard/analytics/BookingPipelineContent';
import { AssistantUtilizationCard } from '@/components/dashboard/analytics/AssistantUtilizationCard';
import { SubtabFavoriteStar } from '@/components/dashboard/analytics/SubtabFavoriteStar';
import { HealthDashboard } from '@/components/dashboard/health-engine/HealthDashboard';
import type { AnalyticsFilters } from '@/pages/dashboard/admin/AnalyticsHub';

interface OperationsTabContentProps {
  filters: AnalyticsFilters;
  subTab?: string;
  onSubTabChange: (value: string) => void;
  organizationId?: string;
}

// Map analytics hub date ranges to operational analytics date ranges
function mapDateRange(dateRange: string): 'tomorrow' | '7days' | '30days' | '90days' {
  switch (dateRange) {
    case 'today':
    case 'yesterday':
      return 'tomorrow';
    case '7d':
    case 'thisWeek':
      return '7days';
    case '30d':
    case 'thisMonth':
    case 'lastMonth':
      return '30days';
    case '90d':
      return '90days';
    default:
      return '30days';
  }
}

export function OperationsTabContent({ filters, subTab = 'overview', onSubTabChange, organizationId }: OperationsTabContentProps) {
  const { data: locations } = useLocations();
  const locationFilter = filters.locationId !== 'all' ? filters.locationId : undefined;
  const operationalDateRange = mapDateRange(filters.dateRange);

  const selectedLocationName = locationFilter
    ? locations?.find(l => l.id === locationFilter)?.name || 'Unknown'
    : 'All Locations';

  const { 
    dailyVolume, 
    hourlyDistribution, 
    statusBreakdown, 
    retention, 
    summary,
    isLoading 
  } = useOperationalAnalytics(locationFilter, operationalDateRange);

  const { workload, isLoading: utilizationLoading } = useStaffUtilization(
    locationFilter,
    operationalDateRange
  );

  const { capacityData, isLoading: capacityLoading } = useHistoricalCapacityUtilization(
    locationFilter,
    operationalDateRange
  );

  const staffingBalance = useLocationStaffingBalance(operationalDateRange);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
          View
        </span>
        <Tabs value={subTab} onValueChange={onSubTabChange}>
          <SubTabsList>
            <VisibilityGate elementKey="operations_overview_subtab" elementName="Overview" elementCategory="Page Tabs">
              <SubTabsTrigger value="overview">Overview</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_appointments_subtab" elementName="Appointments" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="appointments">Appointments</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="appointments" label="Appointments" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_clients_subtab" elementName="Clients" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="clients">Clients</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="clients" label="Clients" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_staffing_subtab" elementName="Staffing" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="staffing">Staffing</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="staffing" label="Staffing" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_staff_utilization_subtab" elementName="Staff Utilization" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="staff-utilization">Staff Utilization</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="staff-utilization" label="Staff Utilization" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_booking_pipeline_subtab" elementName="Booking Pipeline" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="booking-pipeline">Booking Pipeline</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="booking-pipeline" label="Booking Pipeline" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_assistant_subtab" elementName="Assistant Coverage" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="assistant-coverage">Assistant Coverage</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="assistant-coverage" label="Assistant Coverage" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_health_engine_subtab" elementName="Health Engine" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="health-engine">Health Engine</SubTabsTrigger>
                <SubtabFavoriteStar tab="operations" subtab="health-engine" label="Health Engine" />
              </div>
            </VisibilityGate>
          </SubTabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewContent 
            summary={summary}
            retention={retention}
            dailyVolume={dailyVolume}
            isLoading={isLoading}
            onNavigateToTab={onSubTabChange}
            capacityData={capacityData}
            capacityLoading={capacityLoading}
            workload={workload}
            workloadLoading={utilizationLoading}
            staffingBalance={staffingBalance}
          />
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <AppointmentsContent
            summary={summary}
            dailyVolume={dailyVolume}
            statusBreakdown={statusBreakdown}
            hourlyDistribution={hourlyDistribution}
            isLoading={isLoading}
            capacityData={capacityData}
            capacityLoading={capacityLoading}
            dateRange={operationalDateRange}
            analyticsDateRange={filters.dateRange}
            locationName={selectedLocationName}
          />
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientsContent 
            retention={retention}
            isLoading={isLoading}
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          />
        </TabsContent>

        <TabsContent value="staffing" className="mt-6">
          <StaffingContent 
            workload={workload}
            isLoading={utilizationLoading}
            locationId={locationFilter}
          />
        </TabsContent>

        <TabsContent value="staff-utilization" className="mt-6">
          <StaffUtilizationContent 
            locationId={locationFilter}
            dateRange={operationalDateRange}
          />
        </TabsContent>

        <TabsContent value="booking-pipeline" className="mt-6">
          <BookingPipelineContent
            locationId={locationFilter}
            dateRange={operationalDateRange}
          />
        </TabsContent>

        <TabsContent value="assistant-coverage" className="mt-6">
          <AssistantUtilizationCard />
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
