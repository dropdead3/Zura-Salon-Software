import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lock, 
  ChevronDown,
  ChevronRight,
  Info,
  Crown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/hooks/useRoles';
import { 
  usePermissionsByCategory, 
  useRolePermissions, 
  useToggleRolePermission 
} from '@/hooks/usePermissions';
import { getIconByName } from '@/lib/iconResolver';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface PermissionsTabProps {
  canManage: boolean;
}

export function PermissionsTab({ canManage }: PermissionsTabProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['dashboard', 'management']));

  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: permissionsByCategory, permissions, isLoading: permissionsLoading } = usePermissionsByCategory();
  const { data: rolePermissions = [], isLoading: rolePermissionsLoading } = useRolePermissions();
  const togglePermission = useToggleRolePermission();

  // Set initial role when data loads
  useMemo(() => {
    if (roles.length > 0 && !selectedRole) {
      // Default to first non-super_admin role
      const defaultRole = roles.find(r => r.name !== 'super_admin') || roles[0];
      setSelectedRole(defaultRole.name);
    }
  }, [roles, selectedRole]);

  const selectedRoleData = useMemo(() => {
    return roles.find(r => r.name === selectedRole);
  }, [roles, selectedRole]);

  // Check if role has a specific permission
  const hasPermission = (roleName: string, permissionId: string) => {
    return rolePermissions.some(
      rp => rp.role === roleName && rp.permission_id === permissionId
    );
  };

  // Get permission count for a role
  const getRolePermissionCount = (roleName: string) => {
    if (roleName === 'super_admin') {
      return permissions?.length || 0; // Super admin has all
    }
    return rolePermissions.filter(rp => rp.role === roleName).length;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleToggle = (permissionId: string) => {
    if (!selectedRole || selectedRole === 'super_admin') return;
    
    const currentlyHas = hasPermission(selectedRole, permissionId);
    togglePermission.mutate({
      role: selectedRole as AppRole,
      permissionId,
      hasPermission: currentlyHas,
    });
  };

  const isLoading = rolesLoading || permissionsLoading || rolePermissionsLoading;
  const isSuperAdmin = selectedRole === 'super_admin';

  if (isLoading) {
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
      {/* Description Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Role Permissions
          </CardTitle>
          <CardDescription>
            Define what actions each role can perform. Super Admin automatically has all permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Selector */}
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const Icon = getIconByName(role.icon);
              const permCount = getRolePermissionCount(role.name);
              const isSelected = selectedRole === role.name;
              const isSuperAdminRole = role.name === 'super_admin';

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
                  {isSuperAdminRole ? (
                    <Crown className="w-4 h-4" style={{ color: role.color }} />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: role.color }} />
                  )}
                  <span className="text-sm font-medium">
                    {role.display_name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {permCount}/{permissions?.length || 0}
                  </Badge>
                  {isSuperAdminRole && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600">
                      All
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Super Admin Notice */}
      {isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Crown className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 mb-1">Super Admin Role</p>
            <p className="text-amber-600/80">
              Super Admin automatically has all permissions and cannot be restricted.
              Select a different role to configure permissions.
            </p>
          </div>
        </div>
      )}

      {/* Permission Categories */}
      {selectedRoleData && permissionsByCategory && (
        <div className="space-y-4">
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
            const isExpanded = expandedCategories.has(category);
            const grantedCount = categoryPermissions.filter(p => 
              isSuperAdmin || hasPermission(selectedRole, p.id)
            ).length;

            return (
              <Card key={category} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-display text-sm uppercase tracking-wider">
                            {category.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {grantedCount}/{categoryPermissions.length}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-2">
                      {categoryPermissions.map(permission => {
                        const granted = isSuperAdmin || hasPermission(selectedRole, permission.id);
                        
                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md bg-background/50 border border-border/50",
                              !granted && "opacity-50"
                            )}
                          >
                            <Switch
                              checked={granted}
                              onCheckedChange={() => handleToggle(permission.id)}
                              disabled={!canManage || isSuperAdmin || togglePermission.isPending}
                              className="data-[state=checked]:bg-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-sm font-medium",
                                !granted && "line-through text-muted-foreground"
                              )}>
                                {permission.display_name}
                              </div>
                              {permission.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {permission.description}
                                </div>
                              )}
                            </div>
                            {!granted && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                Denied
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state if no permissions */}
      {!permissionsByCategory || Object.keys(permissionsByCategory).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No permissions have been defined yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">About permissions</p>
          <p>
            Permissions control what actions users can <strong>perform</strong>. 
            For what users can <strong>see</strong>, configure visibility in the Role Access tab.
            Both systems work together: a user needs both the permission and visibility to access a feature.
          </p>
        </div>
      </div>
    </div>
  );
}
