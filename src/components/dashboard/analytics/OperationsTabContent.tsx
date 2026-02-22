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
import type { AnalyticsFilters } from '@/pages/dashboard/admin/AnalyticsHub';

interface OperationsTabContentProps {
  filters: AnalyticsFilters;
  subTab?: string;
  onSubTabChange: (value: string) => void;
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

export function OperationsTabContent({ filters, subTab = 'overview', onSubTabChange }: OperationsTabContentProps) {
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
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          View
        </span>
        <Tabs value={subTab} onValueChange={onSubTabChange}>
          <SubTabsList>
            <VisibilityGate elementKey="operations_overview_subtab" elementName="Overview" elementCategory="Page Tabs">
              <SubTabsTrigger value="overview">Overview</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_appointments_subtab" elementName="Appointments" elementCategory="Page Tabs">
              <SubTabsTrigger value="appointments">Appointments</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_clients_subtab" elementName="Clients" elementCategory="Page Tabs">
              <SubTabsTrigger value="clients">Clients</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_staffing_subtab" elementName="Staffing" elementCategory="Page Tabs">
              <SubTabsTrigger value="staffing">Staffing</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_staff_utilization_subtab" elementName="Staff Utilization" elementCategory="Page Tabs">
              <SubTabsTrigger value="staff-utilization">Staff Utilization</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_booking_pipeline_subtab" elementName="Booking Pipeline" elementCategory="Page Tabs">
              <SubTabsTrigger value="booking-pipeline">Booking Pipeline</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="operations_assistant_subtab" elementName="Assistant Coverage" elementCategory="Page Tabs">
              <SubTabsTrigger value="assistant-coverage">Assistant Coverage</SubTabsTrigger>
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
