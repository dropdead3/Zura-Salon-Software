import { DayRateCalendarView } from '@/components/dashboard/day-rate/DayRateCalendarView';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function DayRateCalendar() {
  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <DashboardPageHeader
          title="Day Rate Calendar"
          description="View and manage day rate chair rental bookings"
        />
        <PageExplainer pageId="day-rate-calendar" />

        <DayRateCalendarView />
      </div>
    </DashboardLayout>
  );
}
