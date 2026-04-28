import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { TeamDashboardsCard } from '@/components/dashboard/TeamDashboardsCard';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { Navigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

/**
 * Role Dashboards Configurator
 *
 * Owner-only page for authoring what each role group sees on their dashboard.
 * Lives at `admin/dashboards`. Linked from Settings → "Role Dashboards".
 *
 * Pattern matches AccessHub / StylistLevels — dedicated route, not a settings
 * detail panel — because authoring spans multiple roles and reuses the
 * dashboard's Customize drawer for the actual edit surface.
 */
export default function RoleDashboards() {
  const { dashPath } = useOrgDashboardPath();
  const { data: isPrimaryOwner, isLoading } = useIsPrimaryOwner();

  if (isLoading) return null;
  if (!isPrimaryOwner) return <Navigate to={dashPath('/admin/settings')} replace />;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Role Dashboards"
          description="Curate what each role sees on their dashboard. Authoring for one role mirrors to every role in the same template group, so users with sibling roles see the same layout."
          backTo={dashPath('/admin/settings')}
        />
        <TeamDashboardsCard />
      </div>
    </DashboardLayout>
  );
}
