import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Blocks, 
  Eye, 
  Lock,
  Users,
  Settings2,
  UserPlus,
  MessageSquare,
  Key,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { ModulesTab } from '@/components/access-hub/ModulesTab';
import { UserRolesTab } from '@/components/access-hub/UserRolesTab';
import { RoleAccessTab } from '@/components/access-hub/RoleAccessTab';
import { PermissionsTab } from '@/components/access-hub/PermissionsTab';
import { RoleConfigTab } from '@/components/access-hub/RoleConfigTab';
import { InvitationsTab } from '@/components/access-hub/InvitationsTab';
import { ChatPermissionsHubTab } from '@/components/access-hub/ChatPermissionsHubTab';
import { TeamPinManagementTab } from '@/components/access-hub/TeamPinManagementTab';

type TabValue = 'modules' | 'user-roles' | 'role-access' | 'permissions' | 'role-config' | 'invitations' | 'chat' | 'pins';

export default function AccessHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { roles, isPlatformUser } = useAuth();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const isSuperAdmin = roles.includes('super_admin');
  const canManage = isSuperAdmin || isPlatformUser || isPrimaryOwner;
  
  const tabParam = searchParams.get('tab') as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(tabParam || 'modules');

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && ['modules', 'user-roles', 'role-access', 'permissions', 'role-config', 'invitations', 'chat', 'pins'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
          description="Manage modules, permissions, and visibility in one place"
          actions={
            !canManage ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                View Only
              </Badge>
            ) : undefined
          }
        />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ResponsiveTabsList onTabChange={handleTabChange}>
            <TabsTrigger value="modules" className="gap-2">
              <Blocks className="h-4 w-4" />
              <span className="hidden sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="user-roles" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">User Roles</span>
            </TabsTrigger>
            <TabsTrigger value="role-access" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Role Access</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="pins" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">PINs</span>
            </TabsTrigger>
            <TabsTrigger value="role-config" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Role Config</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="modules" className="mt-0">
            <ModulesTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="user-roles" className="mt-0">
            <UserRolesTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="role-access" className="mt-0">
            <RoleAccessTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="permissions" className="mt-0">
            <PermissionsTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <ChatPermissionsHubTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="pins" className="mt-0">
            <TeamPinManagementTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="role-config" className="mt-0">
            <RoleConfigTab canManage={canManage} />
          </TabsContent>

          <TabsContent value="invitations" className="mt-0">
            <InvitationsTab canManage={canManage} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
