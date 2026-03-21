import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { AccessDeniedView } from './AccessDeniedView';
import { Loader2 } from 'lucide-react';

type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCoach?: boolean;
  requiredPermission?: string;
  requireSuperAdmin?: boolean;
  requirePlatformRole?: PlatformRole;
  requireAnyPlatformRole?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireCoach = false, 
  requiredPermission, 
  requireSuperAdmin = false,
  requirePlatformRole,
  requireAnyPlatformRole = false,
}: ProtectedRouteProps) {
  const { user, loading, isCoach, hasPermission, permissions, roles, platformRoles, hasPlatformRoleOrHigher, isPlatformUser } = useAuth();
  const { isViewingAs, viewAsRole, clearViewAs } = useViewAs();
  const { permissions: effectivePermissions, isLoading: effectivePermissionsLoading } = useEffectivePermissions();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile();
  const location = useLocation();

  // Spinner-first: wait for auth, roles, effective permissions (View As), and profile (super admin)
  const authOrPermissionsLoading =
    loading ||
    (requireSuperAdmin && profileLoading) ||
    (requiredPermission && !isPlatformUser && effectivePermissionsLoading);
  if (authOrPermissionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check platform role requirements
  if (requireAnyPlatformRole && !isPlatformUser) {
    return <Navigate to="/login" replace />;
  }

  if (requirePlatformRole && !hasPlatformRoleOrHigher(requirePlatformRole)) {
    return <Navigate to="/dashboard/platform/overview" replace />;
  }

  // Check super admin access
  if (requireSuperAdmin && !profile?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Permission-based access: deny-by-default when permission required and data known
  // Platform users bypass permission checks for platform routes
  // When in View As mode, use effective permissions for accurate simulation
  if (requiredPermission && !isPlatformUser) {
    // Explicit deny: never grant when effective permissions are empty (transient or known)
    if (effectivePermissions.length === 0) {
      if (isViewingAs) {
        return (
          <AccessDeniedView
            role={viewAsRole}
            permission={requiredPermission}
            onExitViewAs={clearViewAs}
          />
        );
      }
      return <Navigate to="/dashboard" replace />;
    }

    const hasEffectivePermission = effectivePermissions.includes(requiredPermission);

    // In View As mode, show access denied view instead of redirecting
    if (isViewingAs && !hasEffectivePermission) {
      return (
        <AccessDeniedView 
          role={viewAsRole} 
          permission={requiredPermission}
          onExitViewAs={clearViewAs}
        />
      );
    }
    
    // For real users (not in View As mode), redirect if no permission
    if (!isViewingAs && !hasPermission(requiredPermission)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Legacy coach check (fallback for routes without specific permissions)
  if (requireCoach && !isCoach) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
