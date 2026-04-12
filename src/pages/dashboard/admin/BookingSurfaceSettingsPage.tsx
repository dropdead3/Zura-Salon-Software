import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { BookingSurfaceSettings } from '@/components/dashboard/booking-surface/BookingSurfaceSettings';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export default function BookingSurfaceSettingsPage() {
  const { dashPath } = useOrgDashboardPath();
  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Booking Surfaces"
        description="Configure, theme, and deploy your branded booking experience"
        backTo={dashPath('/admin/website-hub')}
      />
      <BookingSurfaceSettings />
    </DashboardLayout>
  );
}
