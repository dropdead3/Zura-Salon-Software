import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { WebsiteSettingsContent } from '@/components/dashboard/settings/WebsiteSettingsContent';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export default function WebsiteHub() {
  const { dashPath } = useOrgDashboardPath();
  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Website Hub"
        description="Theme, booking, retail & SEO settings"
        backTo={dashPath('/admin/management'}
      />
      <WebsiteSettingsContent />
    </DashboardLayout>
  );
}
