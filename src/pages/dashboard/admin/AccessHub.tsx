import { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Blocks,
  Eye,
  Lock,
  Settings2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { ModulesTab } from '@/components/access-hub/ModulesTab';
import { RoleAccessTab } from '@/components/access-hub/RoleAccessTab';
import { PermissionsTab } from '@/components/access-hub/PermissionsTab';
import { RoleConfigTab } from '@/components/access-hub/RoleConfigTab';
import { PageExplainer } from '@/components/ui/PageExplainer';

type TabValue = 'modules' | 'role-access' | 'permissions' | 'role-config';

const VALID_TABS: TabValue[] = ['modules', 'role-access', 'permissions', 'role-config'];

// Legacy tab values that have been relocated → new destinations
const LEGACY_REDIRECTS: Record<string, string> = {
  'user-roles': 'admin/team-members?view=bulk-roles',
  'invitations': 'admin/team-members?view=invitations',
  'pins': 'admin/team-members?view=pins',
  'chat': 'team-chat',
};

export default function AccessHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { roles, isPlatformUser } = useAuth();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const isSuperAdmin = roles.includes('super_admin');
  const canManage = isSuperAdmin || isPlatformUser || isPrimaryOwner;

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<TabValue>(
    (VALID_TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'modules')
  );

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as TabValue)) {
      setActiveTab(tabParam as TabValue);
    }
  }, [tabParam]);

  // Redirect legacy tab params to their new homes
  if (tabParam && LEGACY_REDIRECTS[tabParam]) {
    return <Navigate to={`/dashboard/${LEGACY_REDIRECTS[tabParam]}`} replace />;
  }

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Roles & Controls Hub"
          description="Role-level governance — what each role means, sees, and can do. Per-person controls live in Team Members."
          actions={
            !canManage ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                <PageExplainer pageId="access-hub" />
                View Only
              </Badge>
            ) : undefined
          }
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ResponsiveTabsList onTabChange={handleTabChange}>
            <TabsTrigger value="modules" className="gap-2">
              <Blocks className="h-4 w-4" />
              <span className="hidden sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="role-access" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Role Access</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="role-config" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Role Config</span>
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="modules" className="mt-0">
            <ModulesTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="role-access" className="mt-0">
            <RoleAccessTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="permissions" className="mt-0">
            <PermissionsTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="role-config" className="mt-0">
            <RoleConfigTab canManage={canManage} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
