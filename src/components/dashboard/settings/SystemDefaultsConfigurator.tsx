import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { usePermissionsByCategory, useRolePermissions } from '@/hooks/usePermissions';
import { useRoles } from '@/hooks/useRoles';
import { 
  useRolePermissionDefaults, 
  useSetRolePermissionDefaults,
  useResetRoleToDefaults,
  useSaveCurrentAsDefaults,
} from '@/hooks/useRolePermissionDefaults';
import type { Database } from '@/integrations/supabase/types';
import * as LucideIcons from 'lucide-react';
import { 
  Settings2, 
  Save,
  RotateCcw,
  Download,
  Info,
  CircleDot,
  LayoutDashboard,
  TrendingUp,
  Calendar,
  FileText,
  Users,
  Settings,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

type AppRole = Database['public']['Enums']['app_role'];

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Growth: TrendingUp,
  Scheduling: Calendar,
  Housekeeping: FileText,
  Management: Users,
  Administration: Settings,
};

const categoryOrder = ['Dashboard', 'Growth', 'Scheduling', 'Housekeeping', 'Management', 'Administration'];

const getIconComponent = (iconName: string | null): React.ComponentType<{ className?: string }> => {
  if (!iconName) return CircleDot;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || CircleDot;
};

export function SystemDefaultsConfigurator() {
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [pendingDefaults, setPendingDefaults] = useState<Record<string, Set<string>>>({});
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [confirmSaveAsCurrent, setConfirmSaveAsCurrent] = useState<string | null>(null);

  const { data: permissionsByCategory, isLoading: permissionsLoading } = usePermissionsByCategory();
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useRolePermissions();
  const { data: defaults, isLoading: defaultsLoading } = useRolePermissionDefaults();
  const { data: dynamicRoles, isLoading: rolesLoading } = useRoles();

  const setDefaults = useSetRolePermissionDefaults();
  const resetToDefaults = useResetRoleToDefaults();
  const saveCurrentAsDefaults = useSaveCurrentAsDefaults();

  const isLoading = permissionsLoading || rolePermissionsLoading || defaultsLoading || rolesLoading;

  // Build roles list (exclude super_admin as they always have all)
  const roles = useMemo(() => {
    return dynamicRoles?.filter(r => r.is_active && r.name !== 'super_admin') || [];
  }, [dynamicRoles]);

  // Get default permission IDs for a role
  const getDefaultsForRole = (roleName: string): Set<string> => {
    if (pendingDefaults[roleName]) {
      return pendingDefaults[roleName];
    }
    const roleDefaults = defaults?.filter(d => d.role === roleName).map(d => d.permission_id) || [];
    return new Set(roleDefaults);
  };

  // Get current permission IDs for a role
  const getCurrentForRole = (roleName: string): Set<string> => {
    const rolePerms = rolePermissions?.filter(rp => rp.role === roleName).map(rp => rp.permission_id) || [];
    return new Set(rolePerms);
  };

  // Check if there are unsaved changes for a role
  const hasUnsavedChanges = (roleName: string): boolean => {
    return !!pendingDefaults[roleName];
  };

  // Check difference between current and defaults
  const getDifference = (roleName: string) => {
    const current = getCurrentForRole(roleName);
    const defaultSet = getDefaultsForRole(roleName);
    
    const onlyInCurrent = [...current].filter(id => !defaultSet.has(id));
    const onlyInDefaults = [...defaultSet].filter(id => !current.has(id));
    
    return { onlyInCurrent, onlyInDefaults, hasDifference: onlyInCurrent.length > 0 || onlyInDefaults.length > 0 };
  };

  const toggleDefault = (roleName: string, permissionId: string) => {
    setPendingDefaults(prev => {
      const current = prev[roleName] || getDefaultsForRole(roleName);
      const newSet = new Set(current);
      
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      
      return { ...prev, [roleName]: newSet };
    });
  };

  const saveDefaults = (roleName: string) => {
    const permissionIds = [...getDefaultsForRole(roleName)];
    setDefaults.mutate(
      { role: roleName as AppRole, permissionIds },
      {
        onSuccess: () => {
          setPendingDefaults(prev => {
            const next = { ...prev };
            delete next[roleName];
            return next;
          });
        },
      }
    );
  };

  const discardChanges = (roleName: string) => {
    setPendingDefaults(prev => {
      const next = { ...prev };
      delete next[roleName];
      return next;
    });
  };

  const handleResetToDefaults = (roleName: string) => {
    resetToDefaults.mutate(roleName as AppRole, {
      onSuccess: () => setConfirmReset(null),
    });
  };

  const handleSaveCurrentAsDefaults = (roleName: string) => {
    saveCurrentAsDefaults.mutate(roleName as AppRole, {
      onSuccess: () => setConfirmSaveAsCurrent(null),
    });
  };

  const selectedRoleData = roles.find(r => r.name === selectedRole);
  const RoleIcon = selectedRoleData ? getIconComponent(selectedRoleData.icon) : Settings2;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            System Default Configurator
          </CardTitle>
          <CardDescription>
            Define the default permissions for each role. Use "Reset to Defaults" to restore a role's permissions to these settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg mb-6">
            <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>System Defaults</strong> are the baseline permissions for each role. When you add a new team member,
                they'll automatically receive these permissions based on their role.
              </p>
              <p className="mt-2">
                You can also reset any role back to these defaults at any time.
              </p>
            </div>
          </div>

          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
              {roles.map(role => {
                const Icon = getIconComponent(role.icon);
                const defaultCount = getDefaultsForRole(role.name).size;
                const diff = getDifference(role.name);
                
                return (
                  <TabsTrigger 
                    key={role.name} 
                    value={role.name}
                    className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">{role.display_name}</span>
                    <Badge 
                      variant={diff.hasDifference ? "outline" : "secondary"}
                      className={cn(
                        "ml-1 text-[10px] px-1.5 py-0",
                        diff.hasDifference && "border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-400"
                      )}
                    >
                      {defaultCount}
                    </Badge>
                    {hasUnsavedChanges(role.name) && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {roles.map(role => {
              const Icon = getIconComponent(role.icon);
              const defaultSet = getDefaultsForRole(role.name);
              const currentSet = getCurrentForRole(role.name);
              const diff = getDifference(role.name);
              const unsaved = hasUnsavedChanges(role.name);
              
              return (
                <TabsContent key={role.name} value={role.name} className="space-y-6">
                  {/* Role Header with Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-display font-medium text-lg">
                          {role.display_name} Defaults
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {defaultSet.size} default permissions configured
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unsaved && (
                        <>
                          <Button
                            variant="outline"
                            size={tokens.button.inline}
                            onClick={() => discardChanges(role.name)}
                            className="font-display text-xs"
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            DISCARD
                          </Button>
                          <Button
                            size={tokens.button.inline}
                            onClick={() => saveDefaults(role.name)}
                            disabled={setDefaults.isPending}
                            className="font-display text-xs"
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            SAVE DEFAULTS
                          </Button>
                        </>
                      )}
                      {!unsaved && (
                        <>
                          <Button
                            variant="outline"
                            size={tokens.button.inline}
                            onClick={() => setConfirmSaveAsCurrent(role.name)}
                            disabled={!diff.hasDifference || saveCurrentAsDefaults.isPending}
                            className="font-display text-xs"
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            SAVE CURRENT AS DEFAULT
                          </Button>
                          <Button
                            variant="outline"
                            size={tokens.button.inline}
                            onClick={() => setConfirmReset(role.name)}
                            disabled={!diff.hasDifference || resetToDefaults.isPending}
                            className="font-display text-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            RESET TO DEFAULTS
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Banner */}
                  {diff.hasDifference && !unsaved && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Current permissions differ from defaults.</strong>
                        <span className="ml-1">
                          {diff.onlyInCurrent.length > 0 && `${diff.onlyInCurrent.length} extra`}
                          {diff.onlyInCurrent.length > 0 && diff.onlyInDefaults.length > 0 && ', '}
                          {diff.onlyInDefaults.length > 0 && `${diff.onlyInDefaults.length} missing`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Permission Categories */}
                  <div className="space-y-4">
                    {categoryOrder.map(category => {
                      const permissions = permissionsByCategory?.[category];
                      if (!permissions) return null;

                      const CategoryIcon = categoryIcons[category] || Settings;
                      const defaultCount = permissions.filter(p => defaultSet.has(p.id)).length;

                      return (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-3 flex items-center gap-2 border-b">
                            <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                            <h4 className="font-display font-medium text-sm">{category}</h4>
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {defaultCount}/{permissions.length}
                            </Badge>
                          </div>
                          <div className="divide-y">
                            {permissions.map(permission => {
                              const isDefault = defaultSet.has(permission.id);
                              const isCurrent = currentSet.has(permission.id);
                              const isDifferent = isDefault !== isCurrent;

                              return (
                                <div 
                                  key={permission.id}
                                  className={cn(
                                    "flex items-center justify-between px-4 py-3 transition-colors",
                                    isDefault ? "bg-background" : "bg-muted/50"
                                  )}
                                >
                                  <div className={cn(
                                    "flex-1 min-w-0 mr-4 transition-opacity",
                                    !isDefault && "opacity-50"
                                  )}>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">
                                        {permission.display_name}
                                      </p>
                                      {isDifferent && (
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "text-[9px] px-1.5 py-0",
                                            isCurrent && !isDefault 
                                              ? "border-green-400 text-green-700 dark:text-green-400" 
                                              : "border-red-400 text-red-700 dark:text-red-400"
                                          )}
                                        >
                                          {isCurrent && !isDefault ? (
                                            <><Check className="w-2.5 h-2.5 mr-0.5" /> Active</>
                                          ) : (
                                            <><X className="w-2.5 h-2.5 mr-0.5" /> Inactive</>
                                          )}
                                        </Badge>
                                      )}
                                    </div>
                                    {permission.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {permission.description}
                                      </p>
                                    )}
                                  </div>
                                  <Switch
                                    checked={isDefault}
                                    onCheckedChange={() => toggleDefault(role.name, permission.id)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={!!confirmReset} onOpenChange={() => setConfirmReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to System Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current permissions for <strong>{confirmReset}</strong> with the system defaults.
              Any custom permissions will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmReset && handleResetToDefaults(confirmReset)}
            >
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Current as Defaults Confirmation Dialog */}
      <AlertDialog open={!!confirmSaveAsCurrent} onOpenChange={() => setConfirmSaveAsCurrent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Current as System Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the system defaults for <strong>{confirmSaveAsCurrent}</strong> to match the current active permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmSaveAsCurrent && handleSaveCurrentAsDefaults(confirmSaveAsCurrent)}
            >
              Save as Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
