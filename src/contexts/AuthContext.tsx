import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

// Platform role hierarchy (higher includes all permissions of lower)
const PLATFORM_ROLE_HIERARCHY: Record<PlatformRole, number> = {
  platform_owner: 4,
  platform_admin: 3,
  platform_support: 2,
  platform_developer: 2,
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True once the FIRST session resolution has completed (success or null). Use this — not `loading` — to gate route redirects. */
  authReady: boolean;
  roles: AppRole[];
  permissions: string[];
  platformRoles: PlatformRole[];
  isPlatformUser: boolean;
  isCoach: boolean;
  hasPermission: (permissionName: string) => boolean;
  hasAnyPermission: (permissionNames: string[]) => boolean;
  hasAllPermissions: (permissionNames: string[]) => boolean;
  hasPlatformRole: (role: PlatformRole) => boolean;
  hasPlatformRoleOrHigher: (role: PlatformRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [platformRoles, setPlatformRoles] = useState<PlatformRole[]>([]);

  const isCoach = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
  const isPlatformUser = platformRoles.length > 0;

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data?.map(r => r.role) || []) as AppRole[];
    } catch (err) {
      console.error('Error fetching roles:', err);
      return [];
    }
  };

  const fetchPlatformRoles = async (userId: string): Promise<PlatformRole[]> => {
    try {
      const { data, error } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching platform roles:', error);
        return [];
      }

      return (data?.map(r => r.role) || []) as PlatformRole[];
    } catch (err) {
      console.error('Error fetching platform roles:', err);
      return [];
    }
  };

  const fetchPermissions = async (userRoles: AppRole[]) => {
    if (userRoles.length === 0) return [];
    
    try {
      // Get all permissions for the user's roles
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions:permission_id (
            name
          )
        `)
        .in('role', userRoles);

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }

      // Extract unique permission names
      const permissionNames = new Set<string>();
      data?.forEach(rp => {
        if (rp.permissions && typeof rp.permissions === 'object' && 'name' in rp.permissions) {
          permissionNames.add((rp.permissions as { name: string }).name);
        }
      });

      return Array.from(permissionNames);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      return [];
    }
  };

  const refreshRoles = async () => {
    if (user) {
      const userRoles = await fetchRoles(user.id);
      setRoles(userRoles);
      // Also refresh permissions when roles change
      const userPermissions = await fetchPermissions(userRoles);
      setPermissions(userPermissions);
    }
  };

  const refreshPermissions = async () => {
    if (roles.length > 0) {
      const userPermissions = await fetchPermissions(roles);
      setPermissions(userPermissions);
    }
  };

  // Super-admin / admin / platform users bypass all permission checks
  const isSuperRole = roles.includes('super_admin') || roles.includes('admin') || isPlatformUser;

  // Permission check helpers
  const hasPermission = useCallback((permissionName: string): boolean => {
    if (isSuperRole) return true;
    return permissions.includes(permissionName);
  }, [permissions, isSuperRole]);

  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    if (isSuperRole) return true;
    return permissionNames.some(name => permissions.includes(name));
  }, [permissions, isSuperRole]);

  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    if (isSuperRole) return true;
    return permissionNames.every(name => permissions.includes(name));
  }, [permissions, isSuperRole]);

  const hasPlatformRole = useCallback((role: PlatformRole): boolean => {
    return platformRoles.includes(role);
  }, [platformRoles]);

  const hasPlatformRoleOrHigher = useCallback((requiredRole: PlatformRole): boolean => {
    const requiredLevel = PLATFORM_ROLE_HIERARCHY[requiredRole];
    return platformRoles.some(role => PLATFORM_ROLE_HIERARCHY[role] >= requiredLevel);
  }, [platformRoles]);

  // Version guard: only apply async completions if no newer session resolution started
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);

  const processSession = useCallback(
    (session: Session | null) => {
      const v = ++requestVersionRef.current;

      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setRoles([]);
        setPermissions([]);
        setPlatformRoles([]);
        setLoading(false);
        return;
      }

      // Fetch roles/platformRoles/permissions; apply only if this request is still current
      const userId = session.user.id;
      Promise.all([
        fetchRoles(userId),
        fetchPlatformRoles(userId),
      ])
        .then(async ([userRoles, userPlatformRoles]) => {
          const userPermissions = await fetchPermissions(userRoles);
          return { userRoles, userPlatformRoles, userPermissions };
        })
        .then(({ userRoles, userPlatformRoles, userPermissions }) => {
          if (!mountedRef.current) return;
          if (v !== requestVersionRef.current) return;
          setRoles(userRoles);
          setPlatformRoles(userPlatformRoles);
          setPermissions(userPermissions);
          setLoading(false);
        })
        .catch(() => {
          if (!mountedRef.current) return;
          if (v !== requestVersionRef.current) return;
          setLoading(false);
        });
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    // Set up auth state listener FIRST (Supabase recommended order)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session);
        if (!mountedRef.current) return;
        processSession(session);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', !!session);
      if (!mountedRef.current) return;
      processSession(session);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [processSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    return { 
      error: error as Error | null, 
      data: data ? { user: data.user } : undefined 
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setPermissions([]);
    setPlatformRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
        value={{
          user,
          session,
          loading,
          roles,
          permissions,
          platformRoles,
          isPlatformUser,
          isCoach,
          hasPermission,
          hasAnyPermission,
          hasAllPermissions,
          hasPlatformRole,
          hasPlatformRoleOrHigher,
          signIn,
          signUp,
          signOut,
          refreshRoles,
          refreshPermissions,
          resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
