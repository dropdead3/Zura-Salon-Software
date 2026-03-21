import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { WebsiteSettingsContent } from '@/components/dashboard/settings/WebsiteSettingsContent';

export default function WebsiteHub() {
  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Website Hub"
        description="Theme, booking, retail & SEO settings"
        backTo="/dashboard/admin/management"
      />
      <WebsiteSettingsContent />
    </DashboardLayout>
  );
}
