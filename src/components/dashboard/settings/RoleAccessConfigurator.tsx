import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Navigation, 
  LayoutGrid, 
  Layers,
  Copy,
  RotateCcw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/hooks/useRoles';
import { useDashboardVisibility, useBulkUpdateVisibility, groupVisibilityByElement, groupByCategory } from '@/hooks/useDashboardVisibility';
import { getIconByName } from '@/lib/iconResolver';
import { SidebarLayoutEditor } from './SidebarLayoutEditor';
import { PageTabsAccessPanel } from './PageTabsAccessPanel';
import { WidgetsAccessPanel } from './WidgetsAccessPanel';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function RoleAccessConfigurator() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [activePanel, setActivePanel] = useState<'navigation' | 'tabs' | 'widgets'>('navigation');
  const [copyFromRole, setCopyFromRole] = useState<string>('');
  
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: visibilityData = [], isLoading: visibilityLoading } = useDashboardVisibility();
  const bulkUpdateMutation = useBulkUpdateVisibility();

  // Set initial role when data loads
  useMemo(() => {
    if (roles.length > 0 && !selectedRole) {
      setSelectedRole(roles[0].name);
    }
  }, [roles, selectedRole]);

  const selectedRoleData = useMemo(() => {
    return roles.find(r => r.name === selectedRole);
  }, [roles, selectedRole]);

  // Get visibility stats for a role
  const getRoleStats = (roleName: string) => {
    const roleItems = visibilityData.filter(v => v.role === roleName);
    const visible = roleItems.filter(v => v.is_visible).length;
    const total = roleItems.length;
    return { visible, total };
  };

  // Copy visibility settings from one role to another
  const handleCopyFromRole = async () => {
    if (!copyFromRole || !selectedRole || copyFromRole === selectedRole) return;

    const sourceItems = visibilityData.filter(v => v.role === copyFromRole);
    const updates = sourceItems.map(item => ({
      elementKey: item.element_key,
      role: selectedRole as AppRole,
      isVisible: item.is_visible,
    }));

    await bulkUpdateMutation.mutateAsync(updates);
    setCopyFromRole('');
  };

  // Reset role to all visible
  const handleResetRole = async () => {
    if (!selectedRole) return;

    const roleItems = visibilityData.filter(v => v.role === selectedRole);
    const updates = roleItems.map(item => ({
      elementKey: item.element_key,
      role: selectedRole as AppRole,
      isVisible: true,
    }));

    await bulkUpdateMutation.mutateAsync(updates);
  };

  if (rolesLoading || visibilityLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Role Access Configurator</CardTitle>
          </div>
          <CardDescription>
            Configure navigation links, page tabs, and dashboard widgets visibility for each role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Selector */}
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const Icon = getIconByName(role.icon);
              const stats = getRoleStats(role.name);
              const isSelected = selectedRole === role.name;

              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.name)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                    "hover:shadow-md",
                    isSelected 
                      ? "ring-2 ring-offset-2 ring-primary" 
                      : "border-border hover:border-muted-foreground/50"
                  )}
                  style={{
                    borderColor: isSelected ? role.color : undefined,
                    backgroundColor: isSelected ? `${role.color}15` : undefined,
                  }}
                >
                  <Icon 
                    className="w-4 h-4" 
                    style={{ color: role.color }} 
                  />
                  <span className="text-sm font-medium">
                    {role.display_name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {stats.visible}/{stats.total}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Role Configuration */}
      {selectedRoleData && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getIconByName(selectedRoleData.icon);
                  return (
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedRoleData.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: selectedRoleData.color }} />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-base">
                    {selectedRoleData.display_name} Access
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedRoleData.description || 'Configure what this role can see'}
                  </CardDescription>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Select value={copyFromRole} onValueChange={setCopyFromRole}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <Copy className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Copy from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter(r => r.name !== selectedRole)
                      .map(role => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {copyFromRole && (
                  <Button 
                    size={tokens.button.card} 
                    onClick={handleCopyFromRole}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    {bulkUpdateMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Apply
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size={tokens.button.card}
                  onClick={handleResetRole}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Panel Tabs */}
            <Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as typeof activePanel)}>
              <TabsList className="mb-4">
                <TabsTrigger value="navigation" className="gap-1.5">
                  <Navigation className="w-4 h-4" />
                  Navigation
                </TabsTrigger>
                <TabsTrigger value="tabs" className="gap-1.5">
                  <Layers className="w-4 h-4" />
                  Page Tabs
                </TabsTrigger>
                <TabsTrigger value="widgets" className="gap-1.5">
                  <LayoutGrid className="w-4 h-4" />
                  Widgets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="navigation" className="mt-0">
                <SidebarLayoutEditor externalSelectedRole={selectedRole} />
              </TabsContent>

              <TabsContent value="tabs">
                <PageTabsAccessPanel 
                  role={selectedRole as AppRole}
                  roleColor={selectedRoleData.color}
                />
              </TabsContent>

              <TabsContent value="widgets">
                <WidgetsAccessPanel 
                  role={selectedRole as AppRole}
                  roleColor={selectedRoleData.color}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
