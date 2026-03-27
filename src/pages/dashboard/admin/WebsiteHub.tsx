import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { WebsiteSettingsContent } from '@/components/dashboard/settings/WebsiteSettingsContent';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';


export default function WebsiteHub() {
  const { dashPath } = useOrgDashboardPath();
  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Website Hub"
        description="Theme, booking, retail & SEO settings"
        backTo={dashPath('/admin/management')}
      />
        <PageExplainer pageId="website-hub" />
      <WebsiteSettingsContent />
    </DashboardLayout>
  );
}
