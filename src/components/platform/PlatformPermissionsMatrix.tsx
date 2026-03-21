import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as LucideIcons from 'lucide-react';
import { Lock, CircleDot, Info } from 'lucide-react';
import {
  usePlatformPermissionsByCategory,
  usePlatformRolePermissions,
  useTogglePlatformPermission,
  PLATFORM_PERMISSION_CATEGORIES,
  PLATFORM_ROLES,
  type PlatformRole,
} from '@/hooks/usePlatformPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';

// Helper to get icon component from string name
const getIconComponent = (iconName: string): React.ComponentType<{ className?: string }> => {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || CircleDot;
};

const categoryOrder = ['accounts', 'migrations', 'revenue', 'settings', 'support', 'development'];

export function PlatformPermissionsMatrix() {
  const [selectedRole, setSelectedRole] = useState<PlatformRole>('platform_owner');
  const { data: permissionsByCategory, isLoading: permissionsLoading } = usePlatformPermissionsByCategory();
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = usePlatformRolePermissions();
  const togglePermission = useTogglePlatformPermission();
  const { hasPlatformRoleOrHigher } = useAuth();

  const isLoading = permissionsLoading || rolePermissionsLoading;
  const canManage = hasPlatformRoleOrHigher('platform_admin');

  const hasPermission = (roleName: PlatformRole, permissionId: string) => {
    return rolePermissions?.some(rp => rp.role === roleName && rp.permission_id === permissionId) ?? false;
  };

  const getPermissionCountForRole = (roleName: PlatformRole) => {
    return rolePermissions?.filter(rp => rp.role === roleName).length ?? 0;
  };

  const totalPermissions = Object.values(permissionsByCategory || {}).flat().length;

  const handleToggle = (permissionId: string, currentlyHas: boolean) => {
    // Platform Owner permissions are locked
    if (selectedRole === 'platform_owner') return;
    if (!canManage) return;
    
    togglePermission.mutate({
      role: selectedRole,
      permissionId,
      hasPermission: currentlyHas,
    });
  };

  const selectedRoleData = PLATFORM_ROLES.find(r => r.role === selectedRole);
  const RoleIcon = selectedRoleData ? getIconComponent(selectedRoleData.icon) : CircleDot;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-40 bg-slate-700/50 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 w-full bg-slate-700/50 rounded-xl" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full bg-slate-700/50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2">
        {PLATFORM_ROLES.map(role => {
          const Icon = getIconComponent(role.icon);
          const isSelected = selectedRole === role.role;
          const isOwner = role.role === 'platform_owner';
          
          return (
            <button
              key={role.role}
              onClick={() => setSelectedRole(role.role)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-violet-500/20 border-violet-500/50 text-white"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4", isSelected && "text-violet-400")} />
              <span className="font-medium text-sm">{role.label}</span>
              <PlatformBadge 
                variant={isOwner ? 'success' : 'default'} 
                size="sm"
                className={cn(isOwner && "bg-amber-500/20 text-amber-400 border-amber-500/30")}
              >
                {getPermissionCountForRole(role.role)}/{totalPermissions}
              </PlatformBadge>
            </button>
          );
        })}
      </div>

      {/* Selected Role Header */}
      {selectedRoleData && (
        <div 
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border",
            selectedRole === 'platform_owner'
              ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-amber-500/30"
              : "bg-slate-800/50 border-slate-700/50"
          )}
        >
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${selectedRoleData.color}20` }}
          >
            <RoleIcon className="w-6 h-6" style={{ color: selectedRoleData.color }} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-white text-lg">{selectedRoleData.label} Permissions</h3>
            <p className="text-sm text-slate-400">{selectedRoleData.description}</p>
          </div>
          {selectedRole === 'platform_owner' && (
            <PlatformBadge variant="outline" className="gap-1 border-amber-500/50 text-amber-400">
              <Lock className="w-3 h-3" />
              All Permissions
            </PlatformBadge>
          )}
        </div>
      )}

      {/* Permission Categories */}
      <div className="space-y-4">
        {categoryOrder.map(categoryKey => {
          const permissions = permissionsByCategory?.[categoryKey];
          if (!permissions) return null;

          const categoryMeta = PLATFORM_PERMISSION_CATEGORIES[categoryKey] || { label: categoryKey, icon: 'Settings' };
          const CategoryIcon = getIconComponent(categoryMeta.icon);
          const grantedCount = permissions.filter(p => hasPermission(selectedRole, p.id)).length;

          return (
            <div key={categoryKey} className="rounded-xl border border-slate-700/50 overflow-hidden">
              {/* Category Header */}
              <div className="bg-slate-800/70 px-5 py-4 flex items-center gap-3 border-b border-slate-700/50">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <CategoryIcon className="w-4 h-4 text-violet-400" />
                </div>
                <h4 className="font-medium text-white">{categoryMeta.label}</h4>
                <PlatformBadge variant="secondary" size="sm" className="ml-auto">
                  {grantedCount}/{permissions.length}
                </PlatformBadge>
              </div>

              {/* Permissions List */}
              <div className="divide-y divide-slate-700/30">
                {permissions.map(permission => {
                  const has = hasPermission(selectedRole, permission.id);
                  const isLocked = selectedRole === 'platform_owner';

                  return (
                    <div 
                      key={permission.id}
                      className={cn(
                        "flex items-center justify-between px-5 py-4 transition-colors",
                        has ? "bg-slate-800/30" : "bg-slate-900/30",
                        isLocked && "opacity-80"
                      )}
                    >
                      <div className={cn("flex-1 min-w-0 mr-4", !has && !isLocked && "opacity-50")}>
                        <p className="font-medium text-sm text-white">{permission.display_name}</p>
                        {permission.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{permission.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {isLocked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                <Switch 
                                  checked={true} 
                                  disabled 
                                  className="data-[state=checked]:bg-amber-500"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              Platform Owner always has all permissions
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Switch
                            checked={has}
                            onCheckedChange={() => handleToggle(permission.id, has)}
                            disabled={togglePermission.isPending || !canManage}
                            className="data-[state=checked]:bg-violet-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          <p className="font-medium text-slate-300 mb-1">Permission Hierarchy</p>
          <p>Platform Owner has all permissions and cannot be modified. Changes to other roles take effect immediately.</p>
        </div>
      </div>
    </div>
  );
}
